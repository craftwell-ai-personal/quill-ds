/**
 * `npm run paper:check`: read the Paper file back and compare it with the code.
 *
 * For every story of every synced piece:
 *   text     the text layers Paper holds, in order, equal the story's visible text
 *   values   a few key layers (first text, first button, first filled surface) carry the
 *            colours, sizes and type the browser computed, with Paper's tokens resolved
 *   picture  Paper's 2x export of the layer against a 2x screenshot of the story, with
 *            the pixel method the Figma visual diff uses; a strip (Paper | Storybook | diff)
 *            is saved per story
 *
 * A story REGRESSES when it is worse than its own accepted baseline
 * (paper/visual-baseline.json): the picture differs by more than 1.0 point over the
 * accepted number, a size moved more than 8px, or text or a value that matched no longer
 * does. Same rule and numbers as the Figma visual diff.
 *
 *   npm run paper:check                          # every synced piece; exit 1 on a regression
 *   npm run paper:check -- --only button,faq
 *   npm run paper:check -- --accept --only button   # accept what this run measured for these pieces
 *   npm run paper:check -- --accept --all           # … or for everything (say so on purpose)
 *                                                   # a story whose text does not match is not accepted without --force
 *   npm run paper:check -- --summary out.json       # also write the result as JSON (the daily job reads it)
 *
 * Needs the Paper desktop app open on this Mac; starts its own Storybook. Writes
 * paper/check-report.json (not committed) and prints a markdown summary.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { PNG } from 'pngjs'
import { comparePngs, flatten, padTo, REGRESSION_PCT, REGRESSION_PX, strip } from '../figma-visual-diff.mjs'
import { connect } from './client.mjs'
import { parseColor, sameColor } from './color.mjs'
import { captureStory, launch, normalizeText, paintOrder, visibleTexts } from './convert.mjs'
import { openQuillFile, publicText, readState, root } from './file.mjs'
import { inventory, statusOf } from './pieces.mjs'
import { ensureStorybook } from './storybook.mjs'
import { parseArgs } from './sync.mjs'
import { firstFamily, resolveTokens } from './tokens.mjs'
import { isMain } from '../lib/is-main.mjs'

export const DEFAULT_OUT = '.paper'
export const BASELINE_PATH = join(root, 'paper/visual-baseline.json')
export const REPORT_PATH = join(root, 'paper/check-report.json')
const SCALE = 2
const SIZE_TOLERANCE = 0.5 // CSS px

// ------------------------------------------------------------------ reading Paper's tree (pure)

/**
 * `get_tree_summary` text → `[{ depth, type, name, id }]` in document order, plus the ids
 * whose children the summary cut off (`... 3 children`), to be asked for again.
 */
export function parseTreeSummary(summary) {
  const nodes = []
  const cut = []
  for (const line of summary.split('\n')) {
    const depth = line.match(/^ */)[0].length / 2
    const node = line.match(/^\s*(\w+) "(.*?)" \(([0-9A-Za-z]+-[0-9A-Za-z]+)\)/)
    if (node) nodes.push({ depth, type: node[1], name: node[2], id: node[3] })
    else if (/^\s*\.\.\. \d+ children/.test(line)) cut.push(nodes.findLast((candidate) => candidate.depth === depth - 1)?.id)
  }
  return { nodes, cut: cut.filter(Boolean) }
}

async function paperTree(file, nodeId, asked = new Set()) {
  // Paper cuts a long child list short ("... 3 children"); those nodes are asked for again. If Paper cuts the
  // very node being asked for, asking again would never end: each id is asked for once.
  asked.add(nodeId)
  const { nodes, cut } = parseTreeSummary((await file.data('get_tree_summary', { nodeId, depth: 10 })).summary)
  for (const id of cut) {
    if (asked.has(id)) continue
    const at = nodes.findIndex((node) => node.id === id)
    const deeper = (await paperTree(file, id, asked)).slice(1).map((node) => ({ ...node, depth: node.depth + nodes[at].depth }))
    nodes.splice(at + 1, 0, ...deeper)
  }
  return nodes
}

// ------------------------------------------------------------------ resolving Paper's values (pure)

/** `var(--x)`, `color-mix(in oklab, var(--x) 12%, transparent)` or a literal → `{ r, g, b, a }`. */
export function resolveColor(value, table) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  const token = (name) => table.find((entry) => entry.name === name)?.color ?? null
  const alias = text.match(/^var\((--[\w-]+)\)$/)
  if (alias) return token(alias[1])
  const mix = text.match(/^color-mix\((?:in [\w-]+,\s*)?var\((--[\w-]+)\)(?:\s+([\d.]+)%)?,\s*transparent\)$/)
  if (mix) { const base = token(mix[1]); return base ? { ...base, a: base.a * (mix[2] ? Number(mix[2]) / 100 : 0.5) } : null }
  return parseColor(text)
}

/** A length or a token holding one → px. `context.fontSize` turns a line-height ratio into px. */
export function resolveLength(value, table, { fontSize = null } = {}) {
  if (value === undefined || value === null) return null
  const text = String(value).trim()
  const alias = text.match(/^var\((--[\w-]+)\)$/)
  if (alias) {
    const entry = table.find((candidate) => candidate.name === alias[1])
    if (!entry) return null
    if (entry.type === 'lineHeight') return fontSize === null ? null : entry.ratio * fontSize
    if (entry.type === 'letterSpacing') return fontSize === null ? null : entry.em * fontSize
    if (entry.type === 'fontWeight') return entry.weight
    return entry.px
  }
  if (text.endsWith('em') && !text.endsWith('rem')) return fontSize === null ? null : parseFloat(text) * fontSize
  if (text.endsWith('%')) return fontSize === null ? null : (parseFloat(text) / 100) * fontSize
  if (/calc\(infinity/.test(text)) return 9999
  return parseFloat(text)
}

const fourSides = (value, table) => {
  const parts = String(value ?? '0px').split(/\s+/).map((part) => resolveLength(part, table) ?? 0)
  const [top, right = top, bottom = top, left = right] = parts
  return [top, right, bottom, left]
}

/** Compare one Paper layer's styles with the browser's values for the same element. Returns `[{ property, paper, browser, ok }]`. */
export function compareValues(kind, paperStyles, used, table) {
  const rows = []
  const length = (property, paperValue, browserValue, options) => {
    const resolved = resolveLength(paperValue, table, options)
    const wanted = parseFloat(browserValue)
    rows.push({ property, paper: String(paperValue), browser: String(browserValue), ok: resolved !== null && Math.abs(resolved - wanted) <= SIZE_TOLERANCE })
  }
  const color = (property, paperValue, browserValue) => {
    const [paper, browser] = [resolveColor(paperValue, table), parseColor(browserValue)]
    rows.push({ property, paper: String(paperValue), browser: String(browserValue), ok: sameColor(paper, browser, 1.6) || (!paper && browser?.a === 0) })
  }
  if (kind === 'text') {
    const fontSize = parseFloat(used.fontSize)
    color('color', paperStyles.color, used.color)
    length('font-size', paperStyles.fontSize, used.fontSize)
    if (used.lineHeight !== 'normal') length('line-height', paperStyles.lineHeight, used.lineHeight, { fontSize })
    length('font-weight', paperStyles.fontWeight ?? 400, used.fontWeight)
    const family = String(paperStyles.fontFamily ?? '')
    const paperFamily = family.startsWith('var(') ? table.find((entry) => entry.name === family.slice(4, -1))?.family : firstFamily(family)
    rows.push({ property: 'font-family', paper: family, browser: used.fontFamily, ok: paperFamily === firstFamily(used.fontFamily) })
  } else {
    color('background-color', paperStyles.backgroundColor, used.backgroundColor)
    const radius = Math.min(parseFloat(used.borderTopLeftRadius), 9999)
    if (radius > 0 || paperStyles.borderRadius) {
      const paperRadius = resolveLength(String(paperStyles.borderRadius ?? '0px').split(/\s+/)[0], table)
      // a pill is a pill at any radius past half the box
      rows.push({ property: 'border-radius', paper: String(paperStyles.borderRadius), browser: used.borderTopLeftRadius, ok: Math.abs(paperRadius - radius) <= SIZE_TOLERANCE || paperRadius >= 9999 })
    }
    // Paper reports padding however it stored it: `padding`, the logical pair, or single sides
    const padding = fourSides(paperStyles.padding, table)
    const pair = (value) => { const parts = String(value).split(/\s+/).map((part) => resolveLength(part, table) ?? 0); return [parts[0], parts[1] ?? parts[0]] }
    if (paperStyles.paddingBlock !== undefined) [padding[0], padding[2]] = pair(paperStyles.paddingBlock)
    if (paperStyles.paddingInline !== undefined) [padding[3], padding[1]] = pair(paperStyles.paddingInline)
    ;['Top', 'Right', 'Bottom', 'Left'].forEach((side, index) => {
      const explicit = paperStyles[`padding${side}`]
      const paperSide = explicit !== undefined ? resolveLength(explicit, table) : padding[index]
      const wanted = parseFloat(used[`padding${side}`])
      rows.push({ property: `padding-${side.toLowerCase()}`, paper: `${paperSide}px`, browser: used[`padding${side}`], ok: Math.abs(paperSide - wanted) <= SIZE_TOLERANCE })
    })
    if (parseFloat(used.borderTopWidth) > 0 && used.borderTopStyle !== 'none') {
      length('border-width', paperStyles.borderWidth ?? paperStyles.borderTopWidth ?? 0, used.borderTopWidth)
      color('border-color', paperStyles.borderColor ?? paperStyles.borderTopColor, used.borderTopColor)
    }
  }
  return rows
}

/** The browser-side elements that stand for a piece: its first text, its first button, its first filled surface. */
export function keyNodes(tree) {
  const found = {}
  const walk = (node, parent) => {
    if (typeof node.text === 'string') {
      if (found.text === undefined && normalizeText(node.text, parent.used.whiteSpace).trim()) found.text = parent
      return
    }
    if (node.ghost || (node !== tree && parseFloat(node.used.opacity) === 0)) return
    // a field's value is the first text Paper holds, but it is styled by the field, not by a text element: no fair pair
    if (found.text === undefined && ['input', 'textarea', 'select'].includes(node.tag) && !node.textless && (node.value || node.placeholder)) found.text = false
    if (!found.button && node.slot === 'button') found.button = node
    if (!found.surface && (parseColor(node.used.backgroundColor)?.a ?? 0) > 0 && !['input', 'textarea', 'select', 'img'].includes(node.tag)) found.surface = node
    // in the order Paper holds the layers, so "the first text" is the same text on both sides
    for (const child of paintOrder(node)) walk(child, node)
  }
  walk(tree, tree)
  if (found.text === false) delete found.text
  return found
}

// ------------------------------------------------------------------ exports (Paper chooses the folder)

/**
 * Is this file the export we just asked for? Paper writes exports into the user's Downloads
 * folder, which also holds their own files, so before reading and deleting one the path,
 * the name and the time must all say it is ours.
 */
export function isOurExport(filePath, { layerName, since, downloads = join(homedir(), 'Downloads'), stat = statSync } = {}) {
  if (!filePath || dirname(resolve(filePath)) !== resolve(downloads)) return false
  // Paper names the file after the layer, with `/` turned into `_`, then the scale, then " (2)" when the name is
  // taken (seen in ~/Downloads: "accordion _ default@2x (3).png")
  const expected = layerName.replace(/\//g, '_')
  const name = basename(filePath)
  if (!(name.startsWith(expected) && /^@2x( \(\d+\))?\.png$/.test(name.slice(expected.length)))) return false
  // made by this call: created (not merely touched) after the export was asked for
  try { const info = stat(filePath); return info.mtimeMs >= since - 2000 && (info.birthtimeMs ?? info.mtimeMs) >= since - 2000 } catch { return false }
}

// ------------------------------------------------------------------ the worst region (pure)

/** The colours pixelmatch paints a differing pixel in the diff image (see comparePngs); anti-aliasing is yellow and not counted. */
export const DIFF_COLORS = [[196, 104, 75], [122, 140, 92]]
const TILE = 12 * SCALE // 12 CSS px: a 24px tile of the 2x strip
// How many points worse than accepted the worst region may get. Chosen from the data, see paper/README.md
export const REGION_POINTS = 8

/**
 * The share of differing pixels in the worst 12×12 CSS-px tile of a diff image, and where it is (CSS px).
 * The whole-picture share hides a local fault: a missing 1.5px outline round a composer, or a word drawn as a
 * blank box, is a fraction of a percent of a big story. Tiles step by half a tile, so a fault on a tile edge
 * is still seen whole.
 */
export function worstRegion(diff, { tile = TILE } = {}) {
  const { width, height, data } = diff
  // a running total of differing pixels, so each tile is four lookups
  const sums = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4
      if (DIFF_COLORS.some(([r, g, b]) => data[at] === r && data[at + 1] === g && data[at + 2] === b)) row++
      sums[(y + 1) * (width + 1) + x + 1] = sums[y * (width + 1) + x + 1] + row
    }
  }
  const starts = (size) => { const last = Math.max(0, size - tile); const list = []; for (let at = 0; at < last; at += tile / 2) list.push(at); list.push(last); return list }
  let worst = { pct: 0, x: 0, y: 0 }
  for (const top of starts(height)) {
    for (const left of starts(width)) {
      const [right, bottom] = [Math.min(width, left + tile), Math.min(height, top + tile)]
      const count = sums[bottom * (width + 1) + right] - sums[top * (width + 1) + right] - sums[bottom * (width + 1) + left] + sums[top * (width + 1) + left]
      const pct = Math.round((count / ((right - left) * (bottom - top))) * 1000) / 10
      if (pct > worst.pct) worst = { pct, x: left / SCALE, y: top / SCALE }
    }
  }
  return worst
}

// ------------------------------------------------------------------ baseline and verdicts (pure)

/** What a story measured, in the shape the baseline keeps. */
export const measured = (row) => ({ diffPct: row.picture.diffPct, ...(row.picture.worstRegion ? { worstRegion: row.picture.worstRegion.pct } : {}), paper: row.picture.paper, storybook: row.picture.storybook, text: row.text.ok, values: `${row.valuesOk}/${row.values.length}` })

/** `ok`, `regression` (with reasons) or `unbaselined`, against the story's own accepted numbers. */
export function verdictOf(row, accepted) {
  if (row.error) return { verdict: 'error', reasons: [row.error] }
  if (!accepted) return { verdict: 'unbaselined', reasons: [] }
  const reasons = []
  if (row.picture.diffPct - accepted.diffPct > REGRESSION_PCT) reasons.push(`picture ${row.picture.diffPct.toFixed(2)}% (accepted ${accepted.diffPct.toFixed(2)}%)`)
  // a local fault (a missing word, a lost outline round one control) barely moves the whole-picture number
  const region = row.picture.worstRegion
  if (region && typeof accepted.worstRegion === 'number' && region.pct - accepted.worstRegion > REGION_POINTS) reasons.push(`worst region ${region.pct}% at ${region.x},${region.y} (accepted ${accepted.worstRegion}%)`)
  for (const side of ['paper', 'storybook']) {
    const moved = [0, 1].map((axis) => Math.abs(row.picture[side][axis] - accepted[side][axis]))
    if (moved.some((delta) => delta > REGRESSION_PX)) reasons.push(`${side === 'paper' ? 'Paper' : 'Storybook'} size ${row.picture[side].join('×')} (accepted ${accepted[side].join('×')})`)
  }
  if (accepted.text && !row.text.ok) reasons.push(`text no longer matches (${row.text.paper} of ${row.text.story} layers)`)
  // more values failing than were accepted as failing: a value that matched stopped matching (a pair the check no
  // longer makes, all the others matching, is not worse)
  const [okBefore, ofBefore] = String(accepted.values ?? '').split('/').map(Number)
  if (Number.isFinite(okBefore) && Number.isFinite(ofBefore) && row.values.length - row.valuesOk > ofBefore - okBefore) reasons.push(`values ${row.valuesOk}/${row.values.length} (accepted ${accepted.values})`)
  return { verdict: reasons.length ? 'regression' : 'ok', reasons }
}

export const readBaseline = (path = BASELINE_PATH) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { stories: {} })

/**
 * Merge this run's numbers into the baseline, keys sorted so the file diffs cleanly. A story that errored is
 * never accepted, and one whose text does not match Storybook is accepted only with `force`: a wrong word is
 * a defect, not a rendering difference. `accepted` and `refused` list what happened, for the caller to print.
 */
export function acceptInto(baseline, rows, date, { force = false } = {}) {
  const stories = { ...baseline.stories }
  const accepted = []
  const refused = []
  for (const row of rows) {
    if (row.error) { refused.push(`${row.story}: errored`); continue }
    if (!row.text.ok && !force) { refused.push(`${row.story}: text does not match (use --force to accept anyway)`); continue }
    stories[row.story] = { ...measured(row), piece: row.piece, at: date }
    accepted.push(row.story)
  }
  const baselineNext = { $comment: 'Accepted picture difference and sizes per story, Paper against Storybook. Written by `npm run paper:check -- --accept`; a later check fails a story that is more than 1.0 point worse overall, more than ' + REGION_POINTS + ' points worse in its worst 12px region (worstRegion), or drifts more than 8px.', platform: process.platform, stories: Object.fromEntries(Object.entries(stories).sort(([a], [b]) => a.localeCompare(b))) }
  return { baseline: baselineNext, result: { accepted, refused } }
}

// ------------------------------------------------------------------ one story

async function checkStory(file, page, piece, story, { table, out, base, open, staged }) {
  const row = { piece: piece.slug, story: story.id, title: story.title }
  const captured = await captureStory(page, story.id, { base, screenshot: true, open, staged })
  const parts = story.parts.map((recorded) => ({ recorded, live: captured.roots.find((candidate) => candidate.part === recorded.part) }))
  const missing = parts.filter((part) => !part.live).map((part) => part.recorded.part)
  if (missing.length) throw new Error(`Storybook no longer shows ${missing.join(', ')} (the story opened differently than when it was drawn)`)

  const storyTexts = []
  const paperTexts = []
  row.values = []
  let differing = 0
  let area = 0
  let region = null
  const sizes = { paper: [0, 0], storybook: [0, 0] }
  const strips = []
  for (const { recorded, live } of parts) {
    const nodes = await paperTree(file, recorded.nodeId)
    // text: every Text layer's full content (the summary truncates long strings)
    const texts = []
    for (const node of nodes.filter((candidate) => candidate.type === 'Text')) {
      const info = await file.data('get_node_info', { nodeId: node.id })
      texts.push({ id: node.id, text: String(info.textContent ?? '').replace(/\s+/g, ' ').trim() })
    }
    paperTexts.push(...texts)
    storyTexts.push(...visibleTexts(live.tree))

    // values: pair each key element with the Paper layer in the same position (the piece itself only)
    if (recorded.part === 'main') {
      const keys = keyNodes(live.tree)
      const frames = nodes.filter((node) => node.type === 'Frame').map((node) => node.id)
      // when the story IS a button, the layer carries the story's name, not `button`
      const paperIds = { text: texts[0]?.id, button: keys.button === live.tree ? recorded.nodeId : nodes.find((node) => node.type === 'Frame' && node.name === 'button')?.id }
      const wanted = [...new Set([...frames, paperIds.text].filter(Boolean))]
      const styles = wanted.length ? (await file.data('get_computed_styles', { nodeIds: wanted })).styles : {}
      paperIds.surface = frames.find((id) => styles[id]?.backgroundColor)
      for (const kind of ['text', 'button', 'surface']) {
        if (!keys[kind]) continue
        if (!paperIds[kind]) { row.values.push({ node: kind, property: '(layer)', paper: 'missing', browser: 'present', ok: false }); continue }
        for (const result of compareValues(kind === 'text' ? 'text' : 'frame', styles[paperIds[kind]] ?? {}, keys[kind].used, table)) row.values.push({ node: kind, ...result })
      }
    }

    // picture: Paper writes the export into the Downloads folder and answers with the path
    // the name Paper holds for the layer being exported (read back, not assumed: Paper folds a frame that only wraps one icon into the icon)
    const layerName = nodes[0]?.name ?? `${piece.slug} / ${story.id.split('--')[1]}`
    const since = Date.now()
    const exported = await file.data('export', { pageId: piece.pageId, nodes: { [recorded.nodeId]: [{ format: 'png', scale: `${SCALE}x` }] } })
    const exportPath = exported.exports?.[0]?.filePath
    if (!exportPath || !existsSync(exportPath)) throw new Error(`export produced no file (${JSON.stringify(exported).slice(0, 120)})`)
    const paperPng = flatten(PNG.sync.read(readFileSync(exportPath)))
    // only ever delete the file this call made
    if (isOurExport(exportPath, { layerName, since })) rmSync(exportPath)
    else row.leftover = [...(row.leftover ?? []), exportPath]
    const storybookPng = PNG.sync.read(live.png)
    const result = comparePngs(paperPng, storybookPng)
    differing += result.differing
    area += result.diff.width * result.diff.height
    // the worst 12px tile of any part, and which part it is in
    const local = worstRegion(result.diff)
    if (!region || local.pct > region.pct) region = { ...local, ...(recorded.part === 'main' ? {} : { part: recorded.part }) }
    strips.push(strip(padTo(paperPng, result.diff.width, result.diff.height), padTo(storybookPng, result.diff.width, result.diff.height), result.diff))
    for (const [side, png] of [['paper', paperPng], ['storybook', storybookPng]]) { sizes[side][0] += png.width / SCALE; sizes[side][1] = Math.max(sizes[side][1], png.height / SCALE) }
  }

  const mismatch = storyTexts.findIndex((text, index) => text !== paperTexts[index]?.text)
  row.text = { ok: mismatch < 0 && storyTexts.length === paperTexts.length, story: storyTexts.length, paper: paperTexts.length, ...(mismatch >= 0 ? { firstDifference: { at: mismatch, story: storyTexts[mismatch], paper: paperTexts[mismatch]?.text ?? null } } : {}) }
  row.valuesOk = row.values.filter((value) => value.ok).length
  // several parts (a trigger and its open panel) are stacked into one strip and one number
  const stripPath = join(out, 'strips', `${piece.slug}--${story.id.split('--')[1]}.png`)
  mkdirSync(dirname(stripPath), { recursive: true })
  const width = Math.max(...strips.map((png) => png.width))
  const stacked = padTo(new PNG({ width: 1, height: 1 }), width, strips.reduce((height, png) => height + png.height + 16, -16))
  let y = 0
  for (const png of strips) { PNG.bitblt(png, stacked, 0, 0, png.width, png.height, 0, y); y += png.height + 16 }
  writeFileSync(stripPath, PNG.sync.write(stacked))
  row.picture = { diffPct: Math.round((differing / Math.max(1, area)) * 10000) / 100, worstRegion: region, paper: sizes.paper, storybook: sizes.storybook, strip: stripPath.replace(`${root}/`, '') }
  return row
}

// ------------------------------------------------------------------ report

export function renderSummary(rows, { accepted = false } = {}) {
  const count = (verdict) => rows.filter((row) => row.verdict === verdict).length
  const pieces = new Set(rows.map((row) => row.piece)).size
  const lines = [`## Paper ↔ Storybook check: ${rows.length} stories in ${pieces} pieces · ${count('regression')} regression${count('regression') === 1 ? '' : 's'} · ${count('error')} error${count('error') === 1 ? '' : 's'} · ${count('unbaselined')} without a baseline${accepted ? ' · baseline written' : ''}`, '']
  const worst = (row) => (row.verdict === 'regression' ? 0 : row.verdict === 'error' ? 1 : row.verdict === 'unbaselined' ? 2 : 3)
  const shown = rows.filter((row) => row.verdict !== 'ok' || !row.text?.ok || row.valuesOk < row.values?.length).sort((a, b) => worst(a) - worst(b))
  if (shown.length) {
    lines.push('| piece | story | text | values | picture | worst region | size Paper → Storybook (px) | verdict |', '|---|---|---|---|---:|---:|---|---|')
    for (const row of shown) {
      if (row.error) { lines.push(`| ${row.piece} | ${row.title} | — | — | — | — | — | error: ${row.error} |`); continue }
      const text = `${row.text.paper}/${row.text.story}${row.text.ok ? '' : ' ✗'}`
      lines.push(`| ${row.piece} | ${row.title} | ${text} | ${row.valuesOk}/${row.values.length} | ${row.picture.diffPct.toFixed(2)}% | ${row.picture.worstRegion ? `${row.picture.worstRegion.pct}%` : '—'} | ${row.picture.paper.join('×')} → ${row.picture.storybook.join('×')} | ${row.verdict}${row.reasons?.length ? `: ${row.reasons.join('; ')}` : ''} |`)
    }
    lines.push('')
  }
  const ok = rows.filter((row) => row.verdict === 'ok')
  if (ok.length) lines.push(`${ok.length} stories match their accepted baseline (median picture difference ${median(ok.map((row) => row.picture.diffPct)).toFixed(2)}%).`)
  return lines.join('\n')
}

const median = (values) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0 }

export async function check({ only = [], all = false, out = DEFAULT_OUT, base = process.env.PAPER_STORYBOOK_URL, accept = false, force = false, summary: summaryPath = null, log = console.log, progress = () => {} } = {}) {
  // accepting is a decision about named pieces; "whatever this run happened to measure" is not one
  if (accept && !only.length && !all) throw new Error('--accept needs a scope: --only <piece,…> for the pieces you have looked at, or --all to accept everything on purpose')
  const state = readState()
  const pieces = inventory()
  const outDir = resolve(root, out)
  const synced = state.pieces.filter((entry) => entry.status === 'synced' && (!only.length || only.includes(entry.slug)))
  const unknown = only.filter((slug) => !state.pieces.some((entry) => entry.slug === slug && entry.status === 'synced'))
  if (unknown.length) throw new Error(`not synced, so nothing to check: ${unknown.join(', ')} (run  npm run paper:sync -- --only ${unknown.join(',')})`)
  const paper = await connect()
  const file = await openQuillFile(paper, { state })
  const table = resolveTokens((await file.data('get_tokens')).tokens)
  const storybook = await ensureStorybook({ base, log: progress })
  const { browser, page } = await launch()
  const baseline = readBaseline()
  const rows = []
  try {
    for (const piece of synced) {
      const config = pieces.find((candidate) => candidate.slug === piece.slug)?.config ?? {}
      const open = config.open ?? null
      for (const story of piece.stories) {
        let row
        try {
          row = await checkStory(file, page, piece, story, { table, out: outDir, base: storybook.base, open, staged: config.staged })
        } catch (error) {
          if (error.code === 'not-open') throw error
          row = { piece: piece.slug, story: story.id, title: story.title, error: publicText(error.message, { limit: 200 }) }
        }
        Object.assign(row, verdictOf(row, baseline.stories[story.id]))
        rows.push(row)
        progress(`${piece.slug.padEnd(22)} ${story.title.padEnd(28).slice(0, 28)} ${row.error ? `error: ${row.error}` : `${String(row.picture.diffPct.toFixed(2)).padStart(6)}%  worst ${String(row.picture.worstRegion?.pct ?? '—').padStart(5)}%  text ${row.text.ok ? '✓' : '✗'}  values ${row.valuesOk}/${row.values.length}  ${row.verdict}`}`)
      }
    }
  } finally {
    await browser.close()
    await storybook.stop()
  }
  let acceptance = null
  if (accept) {
    const next = acceptInto(baseline, rows, new Date().toISOString().slice(0, 10), { force })
    acceptance = next.result
    writeFileSync(BASELINE_PATH, JSON.stringify(next.baseline, null, 1) + '\n')
  }
  const stale = statusOf(state, pieces).filter((entry) => entry.status === 'stale').map((entry) => entry.slug)
  const report = { at: new Date().toISOString(), file: state.file, platform: process.platform, stale, rows }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 1) + '\n')
  const summary = renderSummary(rows, { accepted: accept })
  log(summary)
  if (acceptance) {
    log(`\naccepted ${acceptance.accepted.length} stor${acceptance.accepted.length === 1 ? 'y' : 'ies'} in ${new Set(rows.filter((row) => acceptance.accepted.includes(row.story)).map((row) => row.piece)).size} pieces: ${[...new Set(rows.filter((row) => acceptance.accepted.includes(row.story)).map((row) => row.piece))].join(', ')}`)
    for (const line of acceptance.refused) log(`NOT accepted: ${line}`)
  }
  // for a caller that must not parse prose: counts, and the markdown already rendered
  const result = { regressions: rows.filter((row) => row.verdict === 'regression'), errors: rows.filter((row) => row.verdict === 'error') }
  if (summaryPath) writeFileSync(summaryPath, JSON.stringify({ ok: true, at: report.at, stories: rows.length, pieces: new Set(rows.map((row) => row.piece)).size, regressions: result.regressions.map((row) => ({ piece: row.piece, story: row.title, reasons: row.reasons })), errors: result.errors.map((row) => ({ piece: row.piece, story: row.title, error: row.error })), unbaselined: rows.filter((row) => row.verdict === 'unbaselined').length, stale, markdown: summary }, null, 1) + '\n')
  if (stale.length) log(`\n${stale.length} piece${stale.length === 1 ? ' was' : 's were'} checked against code that has changed since Paper was written: ${stale.join(', ')} (run  npm run paper:sync)`)
  const leftover = rows.flatMap((row) => row.leftover ?? [])
  if (leftover.length) log(`\nleft in place (could not be proven to be this run's exports): ${leftover.join(', ')}`)
  return { report, summary, ...result }
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2))
  try {
    const result = await check({ only: args.only, all: args.all, base: args.base, accept: args.accept, force: args.force, summary: args.summary, progress: (line) => console.error(line) })
    process.exit(result.regressions.length || result.errors.length ? 1 : 0)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
