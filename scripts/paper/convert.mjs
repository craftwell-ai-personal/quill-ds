/**
 * Turn a rendered Storybook story into HTML that Paper (paper.design) accepts.
 *
 * Paper builds its layers from HTML with inline styles, but only a subset of CSS: flex is
 * the one layout mode (no grid, no tables, no inline flow, no margins) and a text layer
 * holds one style. So the story is rendered in a real browser, its DOM is read with the
 * styles the browser computed, and each element is rewritten in Paper's terms:
 *
 *   grid           → a flex column, or flex rows with the measured cell widths
 *   table          → flex rows with the measured cell widths
 *   inline text    → a flex row of one-style text runs
 *   margin         → padding on the parent, or a spacer between two siblings
 *   a colour, size, radius, font that equals a Quill token → `var(--token)`
 *
 * Anything that could only be carried by measuring it (a fixed width where the code had a
 * rule) is counted as "approximated", with the reason, so the report can say how much of a
 * piece is a faithful translation and how much is a tracing.
 *
 *   node scripts/paper/convert.mjs <story-id> [--base http://localhost:6150]   # prints the HTML and the counts
 *
 * The pure half (everything but `captureStory`) runs without a browser and is unit-tested.
 */
import { createRequire } from 'node:module'
import { formatColor, mapColors, parseColor, sameColor } from './color.mjs'
import { quillPaperTokens, resolveTokens } from './tokens.mjs'
import { isMain } from '../lib/is-main.mjs'

export const STORYBOOK = process.env.PAPER_STORYBOOK_URL || 'http://localhost:6150'
export const CANVAS_PADDING = 24 // the same breathing room .storybook/preview.tsx gives a story
const SCALE = 2

// ------------------------------------------------------------------ small helpers

const round = (value, places = 2) => Math.round(value * 10 ** places) / 10 ** places
export const px = (value) => `${round(value)}px`
const num = (value) => (typeof value === 'number' ? value : parseFloat(value) || 0)
const escapeText = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttr = (text) => escapeText(text).replace(/"/g, '&quot;')

// ------------------------------------------------------------------ style diffing

/**
 * Values that say nothing: the CSS initial value, or what a flex child gets anyway.
 * Dropping them is what keeps the HTML readable in Paper's inspector.
 */
export const DEFAULTS = {
  'flex-direction': ['row'],
  'flex-wrap': ['nowrap'],
  'align-items': ['normal', 'stretch'],
  'justify-content': ['normal', 'flex-start', 'start'],
  'align-self': ['auto', 'normal'],
  'flex-grow': ['0'],
  'flex-shrink': ['1'],
  'flex-basis': ['auto'],
  gap: ['0px', 'normal', 'normal normal', '0px 0px'],
  'row-gap': ['0px', 'normal'],
  'column-gap': ['0px', 'normal'],
  padding: ['0px', '0px 0px 0px 0px'],
  width: ['auto'],
  height: ['auto'],
  'min-width': ['auto'],
  'min-height': ['auto', '0px'],
  'max-width': ['none'],
  'max-height': ['none'],
  position: ['static'],
  top: ['auto'],
  right: ['auto'],
  bottom: ['auto'],
  left: ['auto'],
  'z-index': ['auto'],
  overflow: ['visible'],
  opacity: ['1'],
  'background-color': ['transparent', 'rgba(0, 0, 0, 0)'],
  'background-image': ['none'],
  'background-size': ['auto', 'auto auto'],
  'background-position': ['0% 0%'],
  'background-repeat': ['repeat'],
  'background-clip': ['border-box'],
  'border-radius': ['0px'],
  'box-shadow': ['none'],
  'font-style': ['normal'],
  'letter-spacing': ['normal', '0px', '0em'],
  'line-height': ['normal'],
  'text-align': ['start', 'left'],
  'white-space': ['normal'],
  'text-transform': ['none'],
  'text-decoration': ['none'],
  'text-overflow': ['clip'],
  'font-variation-settings': ['normal'],
  'font-variant-numeric': ['normal'],
}

/** Drop every declaration that equals its default (or is empty); order is kept. */
export function dropDefaults(style, defaults = DEFAULTS) {
  const kept = {}
  for (const [property, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === '') continue
    if (defaults[property]?.includes(String(value))) continue
    kept[property] = String(value)
  }
  return kept
}

// ------------------------------------------------------------------ margins

/**
 * Paper has no margin. Rewrite the children's margins along the parent's main axis:
 * a margin on the outer edge of the first or last child becomes parent padding (exact);
 * a margin between two siblings becomes a spacer, shortened by the parent's gap because a
 * spacer is one more flex item and so adds one more gap (exact when margin ≥ gap); an
 * `auto` margin is reported as a growing spacer naming the child it belongs to (`of`, `edge`); the caller grows a
 * wrapper around that child instead of adding a layer, because one more flex item would add one more gap. Negative and cross-axis margins cannot be
 * carried and are reported.
 *
 * `children` is `[{ margin: { top, right, bottom, left } }]` with px numbers or 'auto'.
 * Returns `{ padding: { top, right, bottom, left }, spacers: [{ before: index, size | grow }], align: [{ index, value }],
 * lost: [reason], negative }`. `align` carries a cross-axis `auto` margin as `align-self`; `negative` tells the caller
 * that children overlap, which no flex spelling can say.
 */
export function translateMargins({ axis, gap = 0, collapse = false }, children) {
  const [start, end, crossStart, crossEnd] = axis === 'row' ? ['left', 'right', 'top', 'bottom'] : ['top', 'bottom', 'left', 'right']
  const padding = { top: 0, right: 0, bottom: 0, left: 0 }
  const spacers = []
  const lost = []
  const align = []
  const wraps = []
  const size = (value) => (value === 'auto' ? 0 : value)
  children.forEach((child, index) => {
    const margin = child.margin
    // `mx-auto` in a column centres the child; one auto side pushes it to the other edge
    const autos = [margin[crossStart] === 'auto', margin[crossEnd] === 'auto']
    if (autos[0] || autos[1]) align.push({ index, value: autos[0] && autos[1] ? 'center' : autos[0] ? 'flex-end' : 'flex-start' })
    // across the line: the child sits in a frame padded by its margin, so it lines up as its margin box did
    for (const side of [crossStart, crossEnd]) if (margin[side] > 0) wraps.push({ index, side, size: margin[side] })
    for (const side of [start, end, crossStart, crossEnd]) if (margin[side] < 0) lost.push(`negative ${side} margin (${margin[side]}px) dropped`)
    const before = margin[start]
    const previous = index > 0 ? children[index - 1].margin[end] : null
    if (index === 0) {
      if (before === 'auto') spacers.push({ before: 0, grow: true, of: 0, edge: start })
      else if (before > 0) padding[start] += before
    } else {
      if (before === 'auto' || previous === 'auto') {
        spacers.push(before === 'auto' ? { before: index, grow: true, of: index, edge: start } : { before: index, grow: true, of: index - 1, edge: end })
        return
      }
      const [a, b] = [Math.max(0, size(previous)), Math.max(0, before)]
      // siblings in normal block flow share the larger margin; flex and grid items add theirs up
      const between = collapse ? Math.max(a, b) : a + b
      if (between <= 0) return
      if (between >= gap) spacers.push({ before: index, size: between - gap })
      else {
        // too small for a spacer (which would add a whole extra gap): each child is wrapped in a frame padded by its own margin
        if (a > 0) wraps.push({ index: index - 1, side: end, size: a })
        if (b > 0) wraps.push({ index, side: start, size: b })
      }
    }
  })
  const last = children.at(-1)?.margin[end]
  if (last === 'auto') spacers.push({ before: children.length, grow: true, of: children.length - 1, edge: end })
  else if (last > 0) padding[end] += last
  return { padding, spacers, lost, align, wraps, negative: children.some((child) => Object.values(child.margin).some((value) => value < 0)) }
}

// ------------------------------------------------------------------ grid

/**
 * Paper has no grid. A one-column grid is a flex column with the row gap. Anything wider
 * becomes flex rows: children are grouped into rows by the track each one starts in, and each
 * cell keeps its measured width (a fraction or `max-content` track has no flex spelling
 * that survives different content, so the width is traced, not translated).
 *
 * `columns` are the resolved track widths in px, `children` are `[{ x, y, width }]` in
 * document order, positions relative to the grid's content box.
 */
export function planGrid({ columns, columnGap = 0, rowGap = 0, children }) {
  if (columns.length <= 1) return { kind: 'column', gap: rowGap }
  // Which track a cell starts in, from where the browser put it. Cells are read in document order, as the
  // grid placed them: a cell that starts in the same or an earlier track than the one before it begins a new
  // row. (Top edges cannot decide this: centred cells in one row have different tops, and an icon nudged
  // down 2px is still beside its title.)
  const starts = columns.reduce((list, width, index) => [...list, index === 0 ? 0 : list[index - 1] + columns[index - 1] + columnGap], [])
  const trackOf = (x) => starts.reduce((best, start, index) => (Math.abs(start - x) < Math.abs(starts[best] - x) ? index : best), 0)
  const rows = []
  let lastTrack = Infinity
  children.forEach((child, index) => {
    const track = trackOf(child.x)
    if (track <= lastTrack) rows.push({ y: child.y, cells: [] })
    rows.at(-1).cells.push({ index, ...child })
    lastTrack = track
  })
  return {
    kind: 'rows',
    rowGap,
    columnGap,
    rows: rows.map((row) => row.cells.map((cell, position) => {
      // a cell that starts further right than the previous one ended plus the gap skipped a track
      const expected = position === 0 ? 0 : row.cells[position - 1].x + row.cells[position - 1].width + columnGap
      return { index: cell.index, width: cell.width, offset: Math.max(0, round(cell.x - expected)) }
    })),
  }
}

// ------------------------------------------------------------------ token binding

const COLOR_PREFERENCE = {
  // what a role is FOR decides which of several same-valued tokens a property takes
  text: [/^--color-foreground$/, /-foreground$/, /^--color-(link|success|warning|info|working|queued|destructive|text-accent-color)$/],
  background: [/^--color-(background|card|popover|muted|secondary|accent|primary|sidebar|destructive)$/],
  border: [/^--color-(border|input|ring|sidebar-border)$/],
}
const CLASS_PREFIX = { text: ['text'], background: ['bg'], border: ['border', 'divide', 'outline'] }

/**
 * The matcher that swaps a computed value for `var(--token)`. One per conversion: it also
 * counts how many tokenisable values it met (`bindable`) and how many it bound (`bound`).
 */
export function createBinder(tokenTable) {
  const stats = { bound: 0, bindable: 0, unbound: {} }
  const colors = tokenTable.filter((token) => token.type === 'color' && token.color)
  const ofType = (type) => tokenTable.filter((token) => token.type === type)
  const semanticRank = (token) => (token.alias ? 0 : 1)
  const miss = (kind, value) => { stats.unbound[`${kind} ${value}`] = (stats.unbound[`${kind} ${value}`] ?? 0) + 1 }
  const hit = (expression) => { stats.bound++; return expression }

  const preferred = (kind) => {
    const patterns = COLOR_PREFERENCE[kind] ?? []
    const rank = (token) => { const at = patterns.findIndex((pattern) => pattern.test(token.name)); return at < 0 ? patterns.length : at }
    return [...colors].sort((a, b) => rank(a) - rank(b) || semanticRank(a) - semanticRank(b) || a.order - b.order)
  }
  const tint = (token, alpha) => `color-mix(in oklab, var(${token.name}) ${Math.round(alpha * 100)}%, transparent)`

  /** `classes` are the element's own class names (for text: its ancestors' too, nearest first). */
  function color(kind, value, classes = []) {
    const parsed = parseColor(value)
    if (!parsed) return value
    if (parsed.a === 0) return 'transparent'
    stats.bindable++
    // 1. the token the source class named, when it still explains the computed colour
    for (const name of classes) {
      const match = name.match(/^([a-z]+)-([a-z0-9-]+?)(?:\/(\d+))?$/)
      if (!match || !CLASS_PREFIX[kind]?.includes(match[1])) continue
      const token = colors.find((candidate) => candidate.name === `--color-${match[2]}`)
      if (!token) continue
      const percent = match[3] ? Number(match[3]) / 100 : 1
      if (sameColor({ ...token.color, a: token.color.a * percent }, parsed, 1.6)) return hit(percent === 1 ? `var(${token.name})` : tint(token, percent))
    }
    // 2. any token with exactly this colour, semantic roles before the raw palette
    const exact = preferred(kind).find((token) => sameColor(token.color, parsed))
    if (exact) return hit(`var(${exact.name})`)
    // 3. a token at a whole-percent opacity (`bg-destructive/10` computes to a translucent colour)
    if (parsed.a < 1 && Math.abs(parsed.a * 100 - Math.round(parsed.a * 100)) < 0.3) {
      const base = preferred(kind).find((token) => token.color.a === 1 && sameColor(token.color, { ...parsed, a: 1 }, 1.6))
      if (base) return hit(tint(base, parsed.a))
    }
    miss(kind, formatColor(parsed))
    return formatColor(parsed)
  }

  function length(type, pixels, { classes = [], count = true } = {}) {
    if (!pixels) return '0px'
    if (count) stats.bindable++
    const candidates = ofType(type).filter((token) => Math.abs(token.px - pixels) < 0.01)
    // `rounded-lg` names --radius-lg; without a class, a named step beats the bare `--radius`
    const named = candidates.find((token) => classes.some((name) => /^rounded-/.test(name) && token.name === `--radius-${name.slice(8)}`))
    const chosen = named ?? candidates.find((token) => !token.alias && token.name !== '--radius') ?? candidates[0]
    if (chosen) return count ? hit(`var(${chosen.name})`) : `var(${chosen.name})`
    if (count) miss(type, px(pixels))
    return px(pixels)
  }

  function fontFamily(stack) {
    stats.bindable++
    const first = stack.split(',')[0].replace(/["']/g, '').trim()
    // --font-heading before --font-display: both are Fraunces and "heading" is the role components use
    const order = ['--font-sans', '--font-heading', '--font-mono', '--font-ui', '--font-data', '--font-display']
    const token = ofType('fontFamily').filter((candidate) => candidate.family === first).sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))[0]
    if (token) return hit(`var(${token.name})`)
    miss('fontFamily', first)
    return stack
  }

  function fontSize(pixels) {
    return length('fontSize', pixels)
  }

  function lineHeight(pixels, fontPixels) {
    stats.bindable++
    const ratio = pixels / fontPixels
    const sizeToken = ofType('fontSize').find((token) => Math.abs(token.px - fontPixels) < 0.01)
    const candidates = ofType('lineHeight').filter((token) => Math.abs(token.ratio - ratio) < 0.002)
    // the line height that ships WITH this size (`text-sm` carries its own) before a role
    const paired = sizeToken && candidates.find((token) => token.name === `--leading-${sizeToken.name.slice(2)}`)
    const chosen = paired ?? candidates.find((token) => !token.name.startsWith('--leading-text-'))
    if (chosen) return hit(`var(${chosen.name})`)
    miss('lineHeight', `${round(ratio, 3)} of ${px(fontPixels)}`)
    return px(pixels)
  }

  function letterSpacing(pixels, fontPixels) {
    stats.bindable++
    const em = pixels / fontPixels
    const token = ofType('letterSpacing').find((candidate) => Math.abs(candidate.em - em) < 0.001)
    if (token) return hit(`var(${token.name})`)
    miss('letterSpacing', `${round(em, 3)}em`)
    return `${round(em, 3)}em`
  }

  function fontWeight(weight) {
    stats.bindable++
    const token = ofType('fontWeight').find((candidate) => candidate.weight === Number(weight))
    if (token) return hit(`var(${token.name})`)
    miss('fontWeight', weight)
    return String(weight)
  }

  /** Colours inside a gradient: exact token matches only, nothing is counted as missed. */
  function colorsIn(value) {
    return mapColors(clearStops(value), (parsed) => {
      // a see-through stop keeps its hue (see `clearStops`)
      if (parsed.a === 0) return formatColor(parsed)
      const exact = preferred('background').find((token) => sameColor(token.color, parsed))
      stats.bindable++
      return exact ? hit(`var(${exact.name})`) : formatColor(parsed)
    })
  }

  return { stats, color, length, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, colorsIn }
}

// ------------------------------------------------------------------ the tree → Paper nodes

const FIELDS = new Set(['input', 'textarea', 'select'])
const MEDIA = new Set(['video', 'canvas', 'iframe', 'object', 'embed', 'audio'])
const NAMED_TAGS = new Set(['nav', 'button', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'header', 'footer', 'form', 'label', 'a', 'input', 'textarea', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const TABLE_SECTION = new Set(['table-row-group', 'table-header-group', 'table-footer-group'])
export const BREAK = '\uE000'
const isFlex = (display) => display === 'flex' || display === 'inline-flex'
const isGrid = (display) => display === 'grid' || display === 'inline-grid'
const isInlineLevel = (display) => display.startsWith('inline') || display === 'ruby'
const isText = (item) => typeof item.text === 'string'
const outOfFlow = (node) => !isText(node) && (node.used.position === 'absolute' || node.used.position === 'fixed')

const layerName = (node) => node.slot || node.role || (NAMED_TAGS.has(node.tag) ? node.tag : null)
const label = (node) => layerName(node) ?? node.tag

/** Collapse a text node the way the browser's `white-space` would. */
export function normalizeText(text, whiteSpace = 'normal') {
  if (whiteSpace.startsWith('pre') || whiteSpace === 'break-spaces') return text.replaceAll(BREAK, '\n')
  // a <br> arrives as a marker so that collapsing white space cannot swallow the line break
  return text.replace(/\s+/g, ' ').replace(new RegExp(` ?${BREAK} ?`, 'g'), '\n')
}

function sides(used, prefix, suffix = '') {
  return ['Top', 'Right', 'Bottom', 'Left'].map((side) => used[`${prefix}${side}${suffix}`])
}

/** `1px 1px 1px 1px` → `1px`; `1px 2px 1px 2px` → `1px 2px`. */
export function shorthand(values) {
  const [top, right, bottom, left] = values
  if (top === right && right === bottom && bottom === left) return top
  if (top === bottom && right === left) return `${top} ${right}`
  return values.join(' ')
}

/**
 * Tailwind composes `box-shadow` from five variables, so a plain `shadow-sm` computes to four
 * invisible layers and the real one. Keep the layers that draw something.
 */
export function visibleShadows(value) {
  const layers = value.split(/,(?![^(]*\))/).map((layer) => layer.trim())
  const drawn = layers.filter((layer) => { const color = parseColor(layer.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|oklab|oklch|color)\([^()]*\)/)?.[0] ?? ''); return !color || color.a > 0 })
  return drawn.length ? drawn.map((layer) => mapColors(layer, (parsed) => formatColor(parsed))).join(', ') : 'none'
}

/** `a, b(c, d), e` → `['a', 'b(c, d)', 'e']`: a comma list split only where no bracket is open. */
export function splitTopLevel(value) {
  const parts = []
  let depth = 0
  let start = 0
  for (let index = 0; index < value.length; index++) {
    const char = value[index]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) { parts.push(value.slice(start, index).trim()); start = index + 1 }
  }
  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

const LEADING_COLOR = /^(#[0-9a-fA-F]{3,8}\b|(?:rgba?|oklab|oklch|color)\([^()]*\)|transparent\b)/

/**
 * A gradient that fades to `transparent` fades to see-through BLACK as the browser reports it. The browser blends
 * with the alpha taken out first, so the fade keeps its hue; Paper blends the colours as written, so the AI wash and
 * glow went grey. Each see-through stop takes the colour of its nearest visible neighbour, still see-through.
 */
export function clearStops(value) {
  return value.replace(/\b((?:repeating-)?(?:linear|radial|conic)-gradient)\(/g, '\u0000$1(').split('\u0000').map((chunk) => {
    const open = chunk.match(/^((?:repeating-)?(?:linear|radial|conic)-gradient)\(/)
    if (!open) return chunk
    // the gradient's own arguments: up to its matching bracket
    let depth = 0
    let end = -1
    for (let index = open[0].length - 1; index < chunk.length; index++) {
      if (chunk[index] === '(') depth++
      else if (chunk[index] === ')' && --depth === 0) { end = index; break }
    }
    if (end < 0) return chunk
    const parts = splitTopLevel(chunk.slice(open[0].length, end))
    const colors = parts.map((part) => { const found = part.match(LEADING_COLOR); return found ? { text: found[1], color: parseColor(found[1]) } : null })
    const fixed = parts.map((part, index) => {
      if (!colors[index]?.color || colors[index].color.a !== 0) return part
      // the nearest visible stop, the one before first (a fade-out takes the colour it fades from)
      const before = colors.slice(0, index).reverse().find((entry) => entry?.color && entry.color.a > 0)
      const after = colors.slice(index + 1).find((entry) => entry?.color && entry.color.a > 0)
      const source = (before ?? after)?.color
      return source ? `rgba(${Math.round(source.r)}, ${Math.round(source.g)}, ${Math.round(source.b)}, 0)${part.slice(colors[index].text.length)}` : part
    })
    return `${open[1]}(${fixed.join(', ')}${chunk.slice(end)}`
  }).join('')
}

const mixRgb = (first, second, share) => formatColor({ r: first.r + (second.r - first.r) * share, g: first.g + (second.g - first.g) * share, b: first.b + (second.b - first.b) * share, a: first.a + (second.a - first.a) * share })

/**
 * Paper keeps a gradient but drops `background-size`, so a left-to-right gradient sized wider than its box (the AI
 * shimmer at 200%, the working line at 300%, both still at position 0 with motion off) would be squeezed in whole.
 * Cut it to the part the box shows: the stops inside the window, plus the colour at each edge of it.
 * Returns the layer unchanged when it is not that case (another angle, an offset, an image).
 */
export function windowGradient(layer, size = 'auto', position = '0% 0%') {
  const [width, height = 'auto'] = size.split(/\s+/)
  const scale = /%$/.test(width) ? parseFloat(width) / 100 : 1
  if (Math.abs(scale - 1) < 0.001 || !/^(100%|auto)$/.test(height) || !/^0(%|px)?( 0(%|px)?)?$/.test(position.trim())) return layer
  const match = layer.match(/^linear-gradient\((.*)\)$/)
  if (!match) return layer
  const [direction, ...rest] = splitTopLevel(match[1])
  if (!/^(90deg|to right)$/.test(direction)) return layer
  const stops = rest.map((stop) => { const at = stop.match(/\s+(-?[\d.]+)%$/); return { color: parseColor(at ? stop.slice(0, at.index) : stop), at: at ? Number(at[1]) / 100 : null } })
  if (stops.length < 2 || stops.some((stop) => !stop.color)) return layer
  // CSS spreads stops without a position evenly between their neighbours
  stops[0].at ??= 0
  stops.at(-1).at ??= 1
  for (let index = 1; index < stops.length - 1; index++) {
    if (stops[index].at !== null) continue
    const next = stops.findIndex((stop, position) => position > index && stop.at !== null)
    stops[index].at = stops[index - 1].at + (stops[next].at - stops[index - 1].at) / (next - index + 1)
  }
  const colorAt = (point) => {
    const after = stops.findIndex((stop) => stop.at >= point)
    if (after <= 0) return formatColor(stops[after < 0 ? stops.length - 1 : 0].color)
    const [from, to] = [stops[after - 1], stops[after]]
    return mixRgb(from.color, to.color, to.at === from.at ? 0 : (point - from.at) / (to.at - from.at))
  }
  const window = 1 / scale
  const inside = stops.filter((stop) => stop.at > 0 && stop.at < window).map((stop) => `${formatColor(stop.color)} ${round((stop.at / window) * 100)}%`)
  return `linear-gradient(90deg, ${colorAt(0)} 0%, ${inside.length ? `${inside.join(', ')}, ` : ''}${colorAt(window)} 100%)`
}

/** A computed `transform` as the rotation Paper can hold, plus whether anything else (scale, skew, a shift) was in it. */
export function rotationOf(transform) {
  const matrix = transform?.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number)
  if (!matrix) return { degrees: 0, other: Boolean(transform && transform !== 'none') }
  const [a, b, c, d, x, y] = matrix
  const scaleX = Math.hypot(a, b)
  const scaleY = Math.hypot(c, d)
  const degrees = round((Math.atan2(b, a) * 180) / Math.PI, 1)
  return { degrees: degrees === 0 ? 0 : degrees, other: Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01 || Math.abs(x) > 0.5 || Math.abs(y) > 0.5 }
}

/** Rotation from either spelling: the `transform` matrix or Tailwind v4's separate `rotate` property. */
function turnOf(used) {
  const fromMatrix = rotationOf(used.transform)
  const own = used.rotate && used.rotate !== 'none' ? parseFloat(used.rotate) * (/rad$/.test(used.rotate) ? 180 / Math.PI : /turn$/.test(used.rotate) ? 360 : 1) : 0
  const set = (value) => Boolean(value && value !== 'none')
  const matrix = used.transform?.match(/^matrix\(([^)]+)\)$/)?.[1].split(',').map(Number)
  const [byX = 0, byY = 0] = set(used.translate) ? used.translate.split(/\s+/).map((part) => parseFloat(part) || 0) : []
  // a shift in px (a switch's thumb slid to "on"); a percentage one is left to the measured position of floating layers
  const shift = { x: (matrix?.[4] ?? 0) + byX, y: (matrix?.[5] ?? 0) + byY }
  const scaled = matrix ? Math.abs(Math.hypot(matrix[0], matrix[1]) - 1) > 0.01 || Math.abs(Math.hypot(matrix[2], matrix[3]) - 1) > 0.01 : false
  return { degrees: round(fromMatrix.degrees + own, 1), shift, other: scaled || set(used.scale) }
}

/** The background's image layers, each with its own clip, size and position (the browser lists them in step). */
export function backgroundLayers(used) {
  if (!used.backgroundImage || used.backgroundImage === 'none') return []
  const list = (value, fallback) => { const parts = splitTopLevel(value ?? ''); return (index) => parts[index % Math.max(1, parts.length)] ?? fallback }
  const [clip, size, position, repeat] = [list(used.backgroundClip, 'border-box'), list(used.backgroundSize, 'auto'), list(used.backgroundPosition, '0% 0%'), list(used.backgroundRepeat, 'repeat')]
  return splitTopLevel(used.backgroundImage).map((image, index) => ({ image, clip: clip(index), size: size(index), position: position(index), repeat: repeat(index) }))
}

/**
 * A top-to-bottom repeating gradient in px (ruled lines) moved down by `background-position`, which Paper drops:
 * the move is written into the gradient by turning its stops round by that much within one repeat.
 * Returns the layer unchanged for anything else.
 */
export function shiftRepeating(layer, position = '0% 0%') {
  const [x, y = '0px'] = position.trim().split(/\s+/)
  const match = layer.match(/^repeating-linear-gradient\((.*)\)$/)
  if (!match || !/^0(px|%)?$/.test(x) || !/^-?[\d.]+px$/.test(y) || parseFloat(y) === 0) return layer
  const parts = splitTopLevel(match[1])
  if (!LEADING_COLOR.test(parts[0]) && !/^(180deg|to bottom)$/.test(parts[0])) return layer
  const stops = parts.filter((part) => LEADING_COLOR.test(part)).map((part) => { const at = part.match(/\s+(-?[\d.]+)px$/); return at ? { color: parseColor(part.slice(0, at.index)), at: Number(at[1]) } : null })
  if (stops.length < 2 || stops.some((stop) => !stop?.color) || stops[0].at !== 0) return layer
  const period = stops.at(-1).at
  const shift = ((parseFloat(y) % period) + period) % period
  const colorAt = (point) => {
    const after = stops.findIndex((stop) => stop.at >= point)
    if (after <= 0) return stops[after < 0 ? stops.length - 1 : 0].color
    const [from, to] = [stops[after - 1], stops[after]]
    return to.at === from.at ? to.color : parseColor(mixRgb(from.color, to.color, (point - from.at) / (to.at - from.at)))
  }
  const seam = period - shift
  const turned = [
    { color: colorAt(seam), at: 0 },
    ...stops.filter((stop) => stop.at > seam).map((stop) => ({ ...stop, at: stop.at - seam })),
    // where one repeat ends and the next begins
    { color: stops.at(-1).color, at: shift }, { color: stops[0].color, at: shift },
    ...stops.filter((stop) => stop.at > 0 && stop.at < seam).map((stop) => ({ ...stop, at: stop.at + shift })),
    { color: colorAt(seam), at: period },
  ]
  const unique = turned.filter((stop, index) => index === 0 || stop.at !== turned[index - 1].at || formatColor(stop.color) !== formatColor(turned[index - 1].color))
  return `repeating-linear-gradient(${unique.map((stop) => `${formatColor(stop.color)} ${round(stop.at)}px`).join(', ')})`
}

// A gradient that does not repeat (the usage meter's fill) is drawn as a clipped child layer of its stated size
// further down; a repeating one is cut to the part its box shows, and ruled lines are moved to where they start.
const isCut = (layer) => layer.repeat !== 'no-repeat' && windowGradient(layer.image, layer.size, layer.position) !== layer.image
const shownPart = (layer) => (layer.repeat === 'no-repeat' ? layer.image : shiftRepeating(windowGradient(layer.image, layer.size, layer.position), layer.position))

const stopOf = (stop) => { const at = stop.match(/\s+(-?[\d.]+px)$/); return { color: parseColor(at ? stop.slice(0, at.index) : stop), at: at?.[1] ?? null } }

/**
 * Paper has no mask. One shape it can still carry: a round mask that only cuts a disc out of the middle (a tab's
 * curved foot: see-through inside the curve, a ring along it, the page colour beyond), over a fill whose top layer
 * is a radial gradient around the same centre. Both are rings around one point, so they fold into one radial
 * gradient: see-through to where the mask starts, the colour of the layers under the top one (their average, when
 * they are a sweep of near-equal colours) up to where the top layer turns opaque, then the top layer's colour.
 * Returns the folded `background-image`, or null when the mask is anything else.
 */
export function foldRoundMask(used, box) {
  const mask = used.maskImage?.match(/^radial-gradient\((.*)\)$/)
  if (!mask) return null
  const [shape, ...maskStops] = splitTopLevel(mask[1])
  if (!/^circle at /.test(shape) || maskStops.length !== 2) return null
  const [hole, solid] = maskStops.map(stopOf)
  if (hole.color?.a !== 0 || !(solid.color?.a > 0) || !hole.at || !solid.at) return null
  const [top, ...under] = backgroundLayers(used)
  const topMatch = top?.image.match(/^radial-gradient\((.*)\)$/)
  if (!topMatch || !under.length) return null
  const [topShape, ...topStops] = splitTopLevel(topMatch[1])
  if (topShape !== shape || topStops.length !== 2) return null
  const [clear, page] = topStops.map(stopOf)
  if (clear.color?.a !== 0 || !page.color || !clear.at || !page.at) return null
  const colors = []
  for (const layer of under) mapColors(layer.image, (parsed) => { colors.push(parsed); return '' })
  if (!colors.length) return null
  const mean = (key) => colors.reduce((sum, color) => sum + color[key], 0) / colors.length
  const ring = { r: mean('r'), g: mean('g'), b: mean('b'), a: mean('a') }
  // Paper draws a radial gradient as a circle reaching the box's farthest corner, with its centre and stops in %
  // (read back from Paper: px stops came out as a blur, a stated radius was rewritten as `farthest-corner`), so the
  // stops are written as shares of that distance
  const centre = shape.replace(/^circle at /, '').split(/\s+/).map((part) => (/^0(px)?$/.test(part) ? '0%' : part))
  if (centre.length !== 2 || centre.some((part) => !/%$/.test(part)) || !(box?.w > 0 && box?.h > 0)) return null
  const [cx, cy] = centre.map((part, axis) => (parseFloat(part) / 100) * (axis === 0 ? box.w : box.h))
  const reach = Math.hypot(Math.max(cx, box.w - cx), Math.max(cy, box.h - cy))
  const share = (at) => `${round((parseFloat(at) / reach) * 100)}%`
  return `radial-gradient(circle at ${centre.join(' ')}, ${formatColor({ ...ring, a: 0 })} ${share(hole.at)}, ${formatColor(ring)} ${share(solid.at)}, ${formatColor(ring)} ${share(clear.at)}, ${formatColor(page.color)} ${share(page.at)})`
}

/** Gradient text: the background is painted through the letters, so it belongs to the text, not to a box. */
const clipsToText = (used) => /\btext\b/.test(used.backgroundClip ?? '') && used.backgroundImage && used.backgroundImage !== 'none'

/**
 * A gradient edge (Quill's `ai-edge`): a fill clipped to the padding box over a gradient on the border box, seen
 * through a transparent border. Paper has no background-clip and would paint the fill over the whole box, hiding the
 * edge. Returns the layers to keep on the frame (the border-box ones) and those for an inset fill, or null.
 */
export function edgeOf(used) {
  const layers = backgroundLayers(used)
  const inner = layers.filter((layer) => layer.clip === 'padding-box' || layer.clip === 'content-box')
  const outer = layers.filter((layer) => layer.clip === 'border-box')
  const widths = sides(used, 'border', 'Width').map(num)
  const seeThrough = sides(used, 'border', 'Color').some((color, index) => widths[index] > 0 && (parseColor(color)?.a ?? 1) < 1)
  return inner.length && outer.length && seeThrough ? { inner, outer, widths } : null
}

function boxStyles(node, context, extraPadding = { top: 0, right: 0, bottom: 0, left: 0 }) {
  const { used } = node
  const { binder, note } = context
  const style = {}
  const background = parseColor(used.backgroundColor)
  if (background && background.a > 0) style['background-color'] = binder.color('background', used.backgroundColor, node.classes)
  const edge = edgeOf(used)
  if (used.backgroundImage && used.backgroundImage !== 'none' && !clipsToText(used)) {
    const folded = foldRoundMask(used, node.rect)
    if (folded) note('approximated', node, 'round mask folded into the fill (Paper has no mask): one radial gradient, its ring in one colour')
    const layers = edge ? edge.outer : backgroundLayers(used)
    if (!folded && layers.some(isCut)) note('approximated', node, 'a gradient sized wider than its box (background-size) cut to the part its box shows')
    let image = folded ?? layers.map((layer) => shownPart(layer)).join(', ')
    for (const [, url] of image.matchAll(/url\("([^"]+)"\)/g)) {
      if (context.images?.[url]) image = image.replace(`url("${url}")`, `url('${context.images[url]}')`)
      else note('lost', node, `background image not carried (${url.slice(0, 60)})`)
    }
    style['background-image'] = /url\('data:/.test(image) ? image : binder.colorsIn(image)
    if (/url\(/.test(image)) { style['background-size'] = used.backgroundSize; style['background-position'] = used.backgroundPosition; style['background-repeat'] = used.backgroundRepeat }
  }
  // Paper has no background-clip. It only shows where a border is see-through over a fill (every Quill
  // button variant): there Paper paints the fill under the 1px border, so the shape reads 1px larger all round.
  if (used.backgroundClip === 'padding-box' && style['background-color'] && sides(used, 'border', 'Width').some((width, index) => num(width) > 0 && parseColor(sides(used, 'border', 'Color')[index])?.a === 0)) {
    note('lost', node, 'background-clip: padding-box not carried (the fill runs under the transparent border)')
  }

  const widths = sides(used, 'border', 'Width').map(num)
  const styles = sides(used, 'border', 'Style')
  const colors = sides(used, 'border', 'Color')
  const drawn = widths.map((width, index) => width > 0 && styles[index] !== 'none' && styles[index] !== 'hidden')
  if (drawn.some(Boolean)) {
    const declaration = (index) => `${px(widths[index])} ${styles[index]} ${binder.color('border', colors[index], node.classes)}`
    const same = drawn.every(Boolean) && new Set(widths).size === 1 && new Set(styles).size === 1 && new Set(colors).size === 1
    if (same) style.border = declaration(0)
    else ['top', 'right', 'bottom', 'left'].forEach((side, index) => { if (drawn[index]) style[`border-${side}`] = declaration(index) })
  }

  const radii = ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((corner) => num(used[`border${corner}Radius`]))
  if (radii.some((radius) => radius > 0)) {
    // `rounded-full` computes to an astronomically large px value; any radius past half the box is a pill
    const pill = (radius) => radius >= 9999 || radius >= Math.max(node.rect.w, node.rect.h)
    const each = radii.map((radius) => (pill(radius) ? '9999px' : binder.length('radius', radius, { classes: node.classes })))
    style['border-radius'] = shorthand(each)
  }
  if (used.boxShadow && used.boxShadow !== 'none') style['box-shadow'] = visibleShadows(used.boxShadow)
  if (used.outlineStyle !== 'none' && num(used.outlineWidth) > 0) {
    // `auto` is the browser's own focus-ring look, which Paper draws as a heavy black ring: a plain line is closer
    style.outline = `${px(num(used.outlineWidth))} ${used.outlineStyle === 'auto' ? 'solid' : used.outlineStyle} ${binder.color('border', used.outlineColor, node.classes)}`
    if (num(used.outlineOffset)) style['outline-offset'] = px(num(used.outlineOffset))
  }
  style.opacity = String(round(num(used.opacity), 3))
  if ([used.overflowX, used.overflowY].some((value) => value && value !== 'visible')) style.overflow = 'hidden'

  const padding = sides(used, 'padding').map(num)
  const merged = [padding[0] + extraPadding.top, padding[1] + extraPadding.right, padding[2] + extraPadding.bottom, padding[3] + extraPadding.left]
  if (merged.some((value) => value > 0)) style.padding = shorthand(merged.map((value) => binder.length('spacing', value)))

  // Paper keeps a rotation and a blur; it has no scale, skew, mask or clip-path.
  if (used.filter && used.filter !== 'none') style.filter = used.filter
  if (used.backdropFilter && used.backdropFilter !== 'none') style['backdrop-filter'] = used.backdropFilter
  const turn = turnOf(used)
  if (turn.degrees) style.rotate = `${turn.degrees}deg`
  // a root's own transform only places it on the page (a dialog centred with translate): not part of the piece
  if (turn.other && !context.isRoot && !outOfFlow(node)) note('lost', node, `transform not carried (${[used.transform, used.scale, used.translate].filter((value) => value && value !== 'none').join(' ').slice(0, 60)})`)
  for (const [property, name] of [['maskImage', 'mask'], ['clipPath', 'clip-path']]) {
    if (used[property] && used[property] !== 'none' && !(property === 'maskImage' && foldRoundMask(used, node.rect))) note('lost', node, `${name} not carried (${String(used[property]).slice(0, 60)})`)
  }
  return style
}

/** Width, height, min/max and position, from the values the stylesheet asked for (not the px they resolved to). */
function sizeStyles(node, context, { parentIsFlex, isRoot = false, cellWidth = null, parentColumnAuto = false } = {}) {
  context = { ...context, parentColumnAuto }
  const { spec, used, rect } = node
  const style = {}
  const fromSpec = (value, measured, what) => {
    if (!value || value === 'auto' || value === 'none') return value
    if (/^-?[\d.]+(px|%)$/.test(value)) return value.endsWith('px') ? px(parseFloat(value)) : value
    if (/^(fit|min|max)-content$/.test(value)) return value
    // `calc(100% + 12px)` and friends: Paper takes plain lengths, so the measured size stands in
    context.note('approximated', node, `${what} ${value} replaced by its measured size`)
    return px(measured)
  }
  style.width = cellWidth !== null ? px(cellWidth) : fromSpec(spec.width, rect.w, 'width')
  style.height = fromSpec(spec.height, rect.h, 'height')
  // A root that simply fills Storybook's canvas has no width of its own: outside that canvas it needs the one it had.
  // A root that shrink-wraps its content keeps doing so in Paper (Paper rounds text boxes up to whole pixels, so a
  // traced width would be a hair too narrow and wrap the last item).
  if (isRoot && (style.width?.endsWith('%') || ((!style.width || style.width === 'auto') && node.fillsCanvas))) style.width = px(rect.w)
  // a percentage height on a root is a share of Storybook's window, which Paper does not have
  if (isRoot && style.height?.endsWith('%')) style.height = px(rect.h)
  // `height: 100%` of a parent whose own height is automatic: the browser works it out from the layout
  // (a stretched flex child is as tall as its row); Paper collapses it to nothing. Keep what was measured.
  if (!isRoot && style.height?.endsWith('%') && context.parentAutoHeight && used.position !== 'absolute' && used.position !== 'fixed') style.height = px(rect.h)
  // A root sized by something outside itself keeps the size it measured: stretched by Storybook's own flex box
  // (a 560px-tall page grown to fill the window), or pinned to the window's edges (a side drawer, top to bottom).
  if (isRoot) {
    const pinned = used.position === 'fixed' || used.position === 'absolute'
    const stated = (value) => (/px$/.test(value ?? '') ? parseFloat(value) : null)
    if (pinned || (stated(style.height) !== null && Math.abs(stated(style.height) - rect.h) > 1)) style.height = px(rect.h)
    if (pinned || (stated(style.width) !== null && Math.abs(stated(style.width) - rect.w) > 1)) style.width = px(rect.w)
  }
  style['min-width'] = fromSpec(spec.minWidth, rect.w, 'min-width')
  style['max-width'] = fromSpec(spec.maxWidth, rect.w, 'max-width')
  style['min-height'] = fromSpec(spec.minHeight, rect.h, 'min-height')
  style['max-height'] = fromSpec(spec.maxHeight, rect.h, 'max-height')
  if (parentIsFlex) {
    style['flex-grow'] = used.flexGrow
    style['flex-shrink'] = used.flexShrink
    // In a column with no height of its own, a percentage basis has nothing to be a percentage of and the
    // browser falls back to the content's height. Paper takes it literally, so it is left out there.
    style['flex-basis'] = context.parentColumnAuto && /%$/.test(spec.flexBasis ?? '') ? 'auto' : fromSpec(spec.flexBasis, rect.w, 'flex-basis')
    style['align-self'] = used.alignSelf
  }
  if (cellWidth !== null) style['flex-shrink'] = '0'
  // Paper has no aspect-ratio: a box that got its height from one (a calendar day, a 16:9 frame) keeps the measured size
  if (used.aspectRatio && used.aspectRatio !== 'auto' && (!style.height || style.height === 'auto') && rect.h > 0) {
    style.height = px(rect.h)
    if (!style.width || style.width === 'auto') style.width = px(rect.w)
  }
  // a table cell is as tall as its row, whatever it holds
  if (used.display === 'table-cell' && (!style.height || style.height === 'auto')) style['min-height'] = px(rect.h)
  if (isRoot) return style
  if (used.position === 'absolute' || used.position === 'fixed') {
    // Placed where the browser put it, measured against its parent's box. The stated insets cannot be
    // reused: they resolve against whichever ancestor is positioned (or the window), and in Paper the
    // parent frame is the only reference there is. The measured box already includes any translate.
    style.position = 'absolute'
    const turned = turnOf(used).degrees !== 0
    const border = context.parentBorder ?? { left: 0, top: 0 }
    // a rotated box measures as its bounding box; the layer keeps its own size and sits centred in that box
    const own = turned && node.box ? { w: node.box[0], h: node.box[1] } : { w: rect.w, h: rect.h }
    // `fixed` is pinned to the browser window, which Paper does not have: the piece's own box stands in for it,
    // so a sidebar fixed at the window's left edge sits at the piece's left edge instead of hanging outside it
    const shift = used.position === 'fixed' ? context.windowShift ?? { x: 0, y: 0 } : { x: 0, y: 0 }
    const left = rect.x + shift.x + (rect.w - own.w) / 2
    const top = rect.y + shift.y + (rect.h - own.h) / 2
    if (used.position === 'fixed') context.reach?.(left + own.w, top + own.h)
    style.left = px(left - (context.parentRect?.x ?? 0) - border.left)
    style.top = px(top - (context.parentRect?.y ?? 0) - border.top)
    style.width = px(own.w)
    style.height = px(own.h)
    for (const property of ['min-width', 'max-width', 'min-height', 'max-height', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-self']) delete style[property]
  } else {
    if (used.position === 'relative' || used.position === 'sticky') style.position = 'relative'
    // `relative` with an offset (a slider's filled range starting 20% in)
    if (used.position === 'relative') for (const side of ['left', 'top']) if (/^-?[\d.]+(px|%)$/.test(spec[side] ?? '') && parseFloat(spec[side]) !== 0) style[side] = spec[side]
    // an in-flow layer slid by a transform keeps its place in the layout and is drawn moved over; the browser
    // measured how far (a percentage shift such as `calc(100% - 2px)` cannot be read from the style)
    const shift = node.shift ? { x: node.shift[0], y: node.shift[1] } : turnOf(used).shift
    if (used.position === 'sticky' && node.shift) context.note('approximated', node, 'sticky: drawn where it stuck in Storybook\'s window, over what scrolls under it')
    // in a line of text, `vertical-align: -0.15em` lowers an icon from the baseline it otherwise sits on
    if (context.inlineFlow && /^-?[\d.]+px$/.test(used.verticalAlign ?? '')) shift.y -= parseFloat(used.verticalAlign)
    if (Math.abs(shift.x) > 0.5 || Math.abs(shift.y) > 0.5) {
      style.position = 'relative'
      if (Math.abs(shift.x) > 0.5) style.left = px(shift.x)
      if (Math.abs(shift.y) > 0.5) style.top = px(shift.y)
    }
  }
  return style
}

function textStyles(used, classes, context) {
  const { binder } = context
  const fontPixels = num(used.fontSize)
  const style = {
    'font-family': binder.fontFamily(used.fontFamily),
    'font-size': binder.fontSize(fontPixels),
    // 400 is every text layer's default; naming it on each run would bury the weights that mean something
    'font-weight': Number(used.fontWeight) === 400 ? undefined : binder.fontWeight(used.fontWeight),
    'font-style': used.fontStyle,
    'line-height': used.lineHeight === 'normal' ? 'normal' : binder.lineHeight(num(used.lineHeight), fontPixels),
    'letter-spacing': used.letterSpacing === 'normal' || !num(used.letterSpacing) ? 'normal' : binder.letterSpacing(num(used.letterSpacing), fontPixels),
    color: binder.color('text', used.color, classes),
    'text-align': used.textAlign === 'end' ? 'right' : used.textAlign,
    'white-space': used.whiteSpace === 'pre-wrap' || used.whiteSpace === 'pre-line' ? used.whiteSpace : used.whiteSpace === 'nowrap' ? 'nowrap' : used.whiteSpace === 'pre' ? 'pre' : 'normal',
    'text-transform': used.textTransform,
    'text-decoration': used.textDecorationLine,
    'font-variation-settings': used.fontVariationSettings,
    'font-variant-numeric': used.fontVariantNumeric,
  }
  if (used.textOverflow === 'ellipsis' && used.overflowX !== 'visible') { style.overflow = 'hidden'; style['text-overflow'] = 'ellipsis' }
  // gradient text: Paper paints a text layer's background through its letters, as the browser does
  if (clipsToText(used)) {
    if (backgroundLayers(used).some(isCut)) context.note('approximated', { tag: 'gradient text', used }, 'a gradient sized wider than its text (background-size) cut to the part the text shows')
    style['background-image'] = binder.colorsIn(backgroundLayers(used).map((layer) => shownPart(layer)).join(', '))
    style['background-clip'] = 'text'
  }
  return style
}

function layoutOf(node) {
  const { used } = node
  if (isFlex(used.display)) return { kind: 'flex', axis: used.flexDirection.startsWith('column') ? 'column' : 'row' }
  if (isGrid(used.display)) return { kind: 'grid' }
  if (used.display === 'table' || used.display === 'inline-table') return { kind: 'table' }
  if (TABLE_SECTION.has(used.display)) return { kind: 'section' }
  if (used.display === 'table-row') return { kind: 'table-row' }
  return { kind: 'flow' }
}

/** `auto minmax(0px, 1fr) auto` → its three tracks; `none` → none. */
const splitTracks = (value) => {
  if (!value || value === 'none' || value === 'auto') return []
  const tracks = []
  let depth = 0
  let current = ''
  for (const char of value) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (/\s/.test(char) && depth === 0) { if (current) tracks.push(current); current = '' } else current += char
  }
  if (current) tracks.push(current)
  return tracks
}

const gapOf = (used) => ({ row: num(used.rowGap), column: num(used.columnGap) })
const marginOf = (node) => Object.fromEntries(['top', 'right', 'bottom', 'left'].map((side) => {
  const value = node.spec?.[`margin${side[0].toUpperCase()}${side.slice(1)}`]
  return [side, value === 'auto' ? 'auto' : parseFloat(value) || 0]
}))

/** Does this element draw or size a box of its own (as opposed to being a bare run of text)? */
function hasBox(node) {
  const { used } = node
  // a gradient clipped to the text paints the letters, not a box
  const painted = (parseColor(used.backgroundColor)?.a ?? 0) > 0 || (used.backgroundImage !== 'none' && !clipsToText(used)) || used.boxShadow !== 'none'
  const bordered = sides(used, 'border', 'Width').some((width, index) => num(width) > 0 && sides(used, 'border', 'Style')[index] !== 'none')
  const padded = sides(used, 'padding').some((value) => num(value) > 0)
  return painted || bordered || padded || isFlex(used.display) || isGrid(used.display) || node.tag === 'button' || used.display.startsWith('table')
}

/** An inline element that draws something of its own (a highlight's fill, a link's underline box): its fragments are framed. */
const decorated = (node) => (parseColor(node.used.backgroundColor)?.a ?? 0) > 0 || sides(node.used, 'border', 'Width').some((width) => num(width) > 0) || sides(node.used, 'padding').some((value) => num(value) > 0)

/**
 * Inline content as the browser laid it out, line by line. Paper's text layer is a box: it cannot start part-way
 * along a line, so a sentence that wraps and then has a chip after it (or a highlight that starts mid-line) cannot
 * be a wrapping row of runs. Each text node carries the fragments the browser broke it into (`frags`, measured in
 * the page); this groups them, and the inline items between them, into lines.
 *
 * Returns `[{ top, atoms: [{ kind: 'text', text, owner, classes, deco, first, last } | { kind: 'item', child }] }]`
 * with the text already collapsed and trimmed where a line starts or ends, or null when the content is on one
 * line, holds a block, or was not measured. Pure: the converter and the text check both read it.
 */
export function inlineLines(node) {
  if (layoutOf(node).kind !== 'flow' || ['nowrap', 'pre'].includes(node.used.whiteSpace)) return null
  const flowing = node.children.filter((child) => !outOfFlow(child))
  const elements = flowing.filter((child) => !isText(child))
  if (!elements.length || elements.some((child) => !isInlineLevel(child.used.display))) return null
  const atoms = []
  let measured = true
  const visit = (current, classes, deco) => {
    for (const child of current.children) {
      if (isText(child)) {
        if (!child.frags) { if (child.text.trim()) measured = false; continue }
        for (const frag of child.frags) atoms.push({ kind: 'text', text: normalizeText(frag.text, current.used.whiteSpace), top: frag.y, height: frag.h, width: frag.w, owner: current, classes, deco })
        continue
      }
      if (child.ghost || num(child.used.opacity) === 0 || (current !== node && outOfFlow(child))) continue
      if (current === node && outOfFlow(child)) continue
      // a plain inline element (a <mark>, a <strong>) flows its text into the lines; anything else is one item
      if (child.used.display === 'inline' && !['svg', 'img'].includes(child.tag) && !FIELDS.has(child.tag) && !MEDIA.has(child.tag)) visit(child, [...child.classes, ...classes], decorated(child) ? child : deco)
      else atoms.push({ kind: 'item', child, top: child.rect.y, height: child.rect.h })
    }
  }
  visit(node, [], null)
  if (!measured) return null
  // the lines are where the text sits; an item joins the line its middle falls in
  // by the middle of each piece, not its top: a 16px figure and 13.6px words on one baseline have different tops
  const lines = []
  const middle = (atom) => atom.top + atom.height / 2
  const lineOf = (atom) => lines.find((line) => Math.abs(line.middle - middle(atom)) < Math.max(3, Math.min(line.height, atom.height) * 0.3))
  for (const atom of atoms.filter((candidate) => candidate.kind === 'text')) if (!lineOf(atom)) lines.push({ top: atom.top, height: atom.height, middle: middle(atom), atoms: [] })
  for (const atom of atoms) {
    let line = atom.kind === 'text' ? lineOf(atom) : lines.find((candidate) => middle(atom) >= candidate.top - 2 && middle(atom) <= candidate.top + candidate.height + 2)
    if (!line) { line = { top: atom.top, height: atom.height, atoms: [] }; lines.push(line) }
    line.atoms.push(atom)
  }
  if (lines.length < 2) return null
  lines.sort((a, b) => a.top - b.top)
  for (const line of lines) {
    // spaces where a line starts or ends are not drawn by the browser either
    const texts = line.atoms.filter((atom) => atom.kind === 'text')
    const firstAtom = line.atoms[0]
    const lastAtom = line.atoms.at(-1)
    if (firstAtom?.kind === 'text') firstAtom.text = firstAtom.text.trimStart()
    if (lastAtom?.kind === 'text') lastAtom.text = lastAtom.text.trimEnd()
    for (const atom of texts) {
      // where a decorated inline starts and ends, for its padding and corners
      const same = atoms.filter((candidate) => candidate.kind === 'text' && candidate.deco && candidate.deco === atom.deco)
      atom.first = same[0] === atom
      atom.last = same.at(-1) === atom
    }
  }
  return lines
}

/** Overlapping children in the order the browser paints them: a positioned child with a z-index above the rest (stable). */
const raised = (child) => (!isText(child) && child.used.position !== 'static' && child.used.zIndex !== 'auto' ? Number(child.used.zIndex) : 0)
const byStacking = (entries) => entries.map((entry, position) => ({ entry, position })).sort((a, b) => raised(a.entry.child) - raised(b.entry.child) || a.position - b.position).map(({ entry }) => entry)

function spacer(axis, { size, grow }) {
  const style = grow ? { 'flex-grow': '1' } : axis === 'row' ? { width: px(size), 'flex-shrink': '0' } : { height: px(size), 'flex-shrink': '0' }
  return { tag: 'div', name: 'spacer', style: { display: 'flex', ...style }, children: [] }
}

/**
 * Convert a captured tree (see `captureStory`) to Paper nodes.
 * Returns `{ root, stats }`; `serialize(root)` gives the HTML.
 */
export function convertTree(tree, tokenTable, { images = {} } = {}) {
  const binder = createBinder(tokenTable)
  const notes = { approximated: new Map(), lost: [] }
  const stats = { nodes: 0 }
  const note = (kind, node, reason) => {
    if (kind === 'lost') { notes.lost.push(`${label(node)}: ${reason}`); return }
    const reasons = notes.approximated.get(node) ?? []
    notes.approximated.set(node, [...reasons, reason])
  }
  const emit = (paperNode) => { stats.nodes++; return paperNode }

  const textNode = (text, owner, classes, context, extra = {}) => emit({
    tag: 'span',
    text,
    style: dropDefaults({ ...textStyles(owner.used, classes, context), ...extra }),
    children: [],
  })

  function convertSvg(node, context, extra) {
    const fill = context.binder.color('text', node.used.color, context.textClasses)
    let markup = node.svg.replace(/(fill|stroke)="currentColor"/g, `$1="${fill}"`)
    // explicit paints: bind a colour that is exactly a token, leave gradients (`url(#…)`) alone
    markup = markup.replace(/(fill|stroke)="((?:rgba?|oklab|oklch|color)\([^"]*\))"/g, (_, attribute, value) => {
      const parsed = parseColor(value)
      // a see-through paint stays a literal: an SVG attribute cannot hold the color-mix() a token tint needs
      return `${attribute}="${parsed && parsed.a < 1 ? formatColor(parsed) : context.binder.color('background', value)}"`
    })
    // gradient stops stay literal (Paper does not resolve a token there) but in the short spelling
    markup = markup.replace(/stop-color="([^"]+)"/g, (_, value) => { const parsed = parseColor(value); return `stop-color="${parsed ? formatColor(parsed) : value}"` })
    // an icon turned by its class (`rotate-90` on an open chevron, `-rotate-90` on a ring that starts at the top)
    const turn = turnOf(node.used)
    const style = dropDefaults({ ...extra, 'flex-shrink': '0', opacity: String(round(num(node.used.opacity), 3)), ...(turn.degrees ? { rotate: `${turn.degrees}deg` } : {}) })
    const css = Object.entries(style).map(([property, value]) => `${property}:${value}`).join(';')
    const name = node.slot || 'svg'
    return emit({ tag: 'svg', raw: markup.replace(/^<svg/, `<svg layer-name="${escapeAttr(name)}" style="${escapeAttr(css)}"`), style: {}, children: [] })
  }

  /** A picture goes in as a data URI (Paper uploads it into the file); anything else that paints itself is a grey box. */
  function convertMedia(node, context, size) {
    const box = { ...boxStyles(node, context), ...size, width: px(node.rect.w), height: px(node.rect.h), 'flex-shrink': '0' }
    const data = node.tag === 'img' ? images[node.src] : null
    if (data) {
      const css = Object.entries(dropDefaults({ ...box, 'object-fit': node.used.objectFit === 'fill' ? undefined : node.used.objectFit })).map(([property, value]) => `${property}:${value}`).join(';')
      return emit({ tag: 'img', raw: `<img layer-name="${escapeAttr(node.alt || 'image')}" src="${escapeAttr(data)}" style="${escapeAttr(css)}">`, style: {}, children: [] })
    }
    note('lost', node, node.tag === 'img' ? `image not carried (${String(node.src).slice(0, 60)}): drawn as a placeholder` : `<${node.tag}> cannot be drawn: placeholder`)
    return emit({ tag: 'div', name: `${node.tag} (placeholder)`, style: dropDefaults({ display: 'flex', 'background-color': 'var(--color-muted)', ...box }), children: [] })
  }

  function convert(node, inherited) {
    const context = { ...inherited, binder, note, images }
    const isRoot = Boolean(inherited.isRoot)
    const textClasses = [...node.classes, ...inherited.textClasses]
    context.textClasses = textClasses
    // Paper makes no layer at all for something fully transparent (a row's "more" button that only shows on
    // hover). Out of flow it is simply left out; in flow it still takes up room, so an empty box holds its place.
    if ((node.ghost || num(node.used.opacity) === 0) && !isRoot) {
      if (outOfFlow(node)) return null
      return emit({ tag: 'div', name: `${label(node)} (hidden)`, style: dropDefaults({ display: 'flex', width: px(node.rect.w), height: px(node.rect.h), 'flex-shrink': '0', ...(inherited.parentIsFlex ? { 'align-self': node.used.alignSelf } : {}) }), children: [] })
    }
    const size = sizeStyles(node, context, { ...inherited, isRoot })
    if (node.tag === 'svg') return convertSvg(node, context, size)
    if (node.tag === 'img' || MEDIA.has(node.tag)) return convertMedia(node, context, size)

    const layout = layoutOf(node)
    const flowing = node.children.filter((child) => !outOfFlow(child))
    const floating = node.children.filter(outOfFlow)
    const elements = flowing.filter((child) => !isText(child))
    const runs = flowing.filter(isText).map((child) => normalizeText(child.text, node.used.whiteSpace)).filter((text) => text.trim())
    const childContext = { textClasses, parentAutoHeight: !/px$/.test(node.spec.height ?? ''), windowShift: inherited.windowShift, reach: inherited.reach, parentRect: node.rect, parentBorder: { left: num(node.used.borderLeftWidth), top: num(node.used.borderTopWidth) } }

    // A form field shows its value (or its placeholder) as text; the caret and selection are not design.
    if (FIELDS.has(node.tag)) {
      // checkboxes, radios, sliders, colour wells have no text of their own; their box is all there is
      const shown = node.textless ? '' : node.value || node.placeholder || ''
      const tone = node.value ? {} : { color: binder.color('text', node.placeholderColor ?? node.used.color) }
      const frame = { display: 'flex', 'flex-direction': 'column', 'justify-content': node.tag === 'textarea' ? 'flex-start' : 'center', ...boxStyles(node, context), ...size }
      // a field's width is the browser's default (about 20 characters) unless a rule says otherwise: keep what it measured
      if (!frame.width || frame.width === 'auto') frame.width = px(node.rect.w)
      if (!frame.height || frame.height === 'auto') frame.height = px(node.rect.h)
      const lines = node.tag === 'textarea' ? { 'white-space': 'pre-wrap' } : { 'white-space': 'nowrap', overflow: 'hidden' }
      return emit({ tag: 'div', name: layerName(node) ?? node.tag, style: dropDefaults(frame), children: shown ? [textNode(shown, node, textClasses, context, { ...tone, ...lines })] : [] })
    }

    // A bare run of text: one Paper text layer, no frame around it.
    if (!elements.length && !floating.length && runs.length === 1 && !hasBox(node)) {
      const own = dropDefaults(size)
      return textNode(runs[0].trim(), node, textClasses, context, own)
    }

    let frame = { display: 'flex' }
    let children = []
    let axis = 'row'
    let gap = 0
    let collapse = false
    let marginItems = elements
    const convertChild = (child, extra = {}) => convert(child, { ...childContext, ...extra })
    // An item in a line of text (an inline block, an icon). Its margins hold it off its neighbours and, top and
    // bottom, make its line taller; Paper has no margin, so a frame padded by them stands in its place.
    const inlineItem = (child) => {
      const converted = convertChild(child, { inlineFlow: true })
      const margin = marginOf(child)
      const sidesOf = ['top', 'right', 'bottom', 'left'].map((side) => (margin[side] === 'auto' ? 0 : Math.max(0, margin[side])))
      // lowered by vertical-align, the item reaches that much less above the line (its paint is moved by the child)
      const lowered = /^-[\d.]+px$/.test(child.used.verticalAlign ?? '') ? -parseFloat(child.used.verticalAlign) : 0
      sidesOf[0] = round(Math.max(0, sidesOf[0] - lowered))
      // a block among inline content is a line of its own, spaced by the caller
      if (!converted || child.used.display === 'inline' || !isInlineLevel(child.used.display) || !sidesOf.some((size) => size > 0)) return converted
      return emit({ tag: 'div', name: 'margin', style: { display: 'flex', padding: shorthand(sidesOf.map(px)), 'flex-shrink': '0' }, children: [converted] })
    }

    if (layout.kind === 'flex') {
      axis = layout.axis
      const gaps = gapOf(node.used)
      gap = axis === 'row' ? gaps.column : gaps.row
      Object.assign(frame, {
        'flex-direction': node.used.flexDirection,
        'flex-wrap': node.used.flexWrap,
        'align-items': node.used.alignItems,
        'justify-content': node.used.justifyContent,
        gap: gaps.row === gaps.column ? binder.length('spacing', gaps.row) : `${binder.length('spacing', gaps.row)} ${binder.length('spacing', gaps.column)}`,
      })
      // Paper rounds every text box up to a whole pixel after it has sized the row, so a wrapping row that
      // exactly fitted its items in the browser pushes its last item onto a second line. A row that sat on
      // one line and has no growing child is written as not wrapping.
      const tops = elements.map((child) => child.rect.y)
      if (node.used.flexWrap !== 'nowrap' && axis === 'row' && elements.length > 1 && Math.max(...tops) - Math.min(...tops) < Math.min(...elements.map((child) => child.rect.h || 1)) && !elements.some((child) => Number(child.used.flexGrow) > 0)) {
        frame['flex-wrap'] = 'nowrap'
        note('approximated', node, 'a one-line wrapping row written as non-wrapping (Paper rounds text widths up, which would wrap it)')
      }
      // text directly inside a flex box is an anonymous flex item: it becomes a run of its own
      marginItems = flowing.filter((child) => !isText(child) || normalizeText(child.text, node.used.whiteSpace).trim())
      const columnAuto = axis === 'column' && (!node.spec.height || node.spec.height === 'auto') && !isRoot
      children = marginItems.map((child) => (isText(child) ? textNode(normalizeText(child.text, node.used.whiteSpace).trim(), node, textClasses, context) : convertChild(child, { parentIsFlex: true, parentColumnAuto: columnAuto })))
    } else if (layout.kind === 'grid') {
      const columns = node.used.gridTemplateColumns.split(/\s+/).map(num).filter((value) => value > 0)
      const gaps = gapOf(node.used)
      const inner = { x: node.rect.x + num(node.used.borderLeftWidth) + num(node.used.paddingLeft), y: node.rect.y + num(node.used.borderTopWidth) + num(node.used.paddingTop) }
      const plan = planGrid({ columns, columnGap: gaps.column, rowGap: gaps.row, children: elements.map((child) => ({ x: child.rect.x - (child.shift?.[0] ?? 0) - inner.x, y: child.rect.y - (child.shift?.[1] ?? 0) - inner.y, width: child.rect.w })) })
      axis = 'column'
      frame['flex-direction'] = 'column'
      if (!elements.length && runs.length) {
        // a grid used only to centre a label (`grid place-items-center`): one text layer, placed the same way
        const place = (value) => (['center', 'end', 'flex-end', 'start', 'flex-start'].includes(value) ? value.replace(/^(start|end)$/, 'flex-$1') : undefined)
        frame['align-items'] = place(node.used.justifyItems)
        frame['justify-content'] = place(node.used.alignItems)
        marginItems = []
        children = [textNode(runs.join(' ').trim(), node, textClasses, context)]
      } else if (plan.kind === 'column') {
        if (runs.length) note('lost', node, 'text directly inside a grid, beside other content, dropped')
        gap = plan.gap
        frame.gap = binder.length('spacing', plan.gap)
        // in a column, `justify-items` is the cross axis and `align-content` the main one
        if (!['normal', 'stretch', 'legacy'].includes(node.used.justifyItems)) frame['align-items'] = node.used.justifyItems
        if (!['normal', 'stretch'].includes(node.used.alignContent)) frame['justify-content'] = node.used.alignContent
        // one cell: its row stretches to the grid's height and `align-items` places the child in it (an avatar's mark)
        else if (elements.length === 1 && ['center', 'end', 'flex-end'].includes(node.used.alignItems)) frame['justify-content'] = node.used.alignItems === 'center' ? 'center' : 'flex-end'
        // A row track sized in `fr` shares out the grid's free height (a panel's thread between its header and
        // composer, which pins the composer to the bottom). One child per row in a one-column grid: it grows.
        // Without an `fr` row, rows the grid did not size (`auto`, or none stated) stretch to fill it unless it packs
        // them (`content-start`): a page with a minimum height, its one row, and the page inside that row.
        const rows = splitTracks(node.spec.gridTemplateRows)
        const shares = rows.length === elements.length ? rows.map((track) => track.match(/([\d.]+)fr\)?$/)?.[1] ?? null) : elements.map(() => null)
        const fixedHeight = Boolean(node.spec.height && node.spec.height !== 'auto' && !node.spec.height.endsWith('%'))
        const sized = fixedHeight || (node.spec.minHeight && !['auto', '0px'].includes(node.spec.minHeight))
        const stretchAuto = sized && !shares.some(Boolean) && ['normal', 'stretch'].includes(node.used.alignContent) && (rows.length === 0 || rows.length === elements.length)
        children = elements.map((child, index) => {
          const converted = convertChild(child)
          if (!converted || converted.raw || outOfFlow(child)) return converted
          const fixed = /px$/.test(child.spec.height ?? '')
          // with a height of its own the grid shares out a fixed amount (`minmax(0, 1fr)` may shrink below its
          // content, and scrolls); without one it grows with its content, so the row starts from its content's height
          if (shares[index]) Object.assign(converted.style, fixedHeight ? { 'flex-grow': shares[index], 'flex-basis': '0px', 'min-height': '0px' } : { 'flex-grow': shares[index] })
          else if (stretchAuto && (rows[index] ?? 'auto') === 'auto' && !fixed && ['auto', 'normal', 'stretch'].includes(child.used.alignSelf)) converted.style['flex-grow'] = '1'
          return converted
        })
      } else {
        note('approximated', node, `${columns.length}-column grid drawn as flex rows with measured cell widths`)
        frame.gap = binder.length('spacing', plan.rowGap)
        marginItems = []
        const rowHeight = (row, position) => {
          // a cell that spans rows (an alert's icon beside its title and text) says nothing about one row's height
          const next = plan.rows[position + 1]
          const limit = next ? elements[next[0].index].rect.y : Infinity
          const own = row.map((cell) => elements[cell.index].rect).filter((box) => box.y + box.h <= limit + 1)
          return own.length ? px(Math.max(...own.map((box) => box.h))) : undefined
        }
        children = plan.rows.map((row, position) => emit({
          tag: 'div',
          name: 'row',
          // a row is as tall as the grid made it (a one-row grid filling a tall page), not just as tall as its content
          style: dropDefaults({ display: 'flex', gap: binder.length('spacing', plan.columnGap), 'align-items': ['normal', 'stretch'].includes(node.used.alignItems) ? 'stretch' : node.used.alignItems, 'min-height': rowHeight(row, position), 'flex-shrink': '0' }),
          children: row.flatMap((cell) => [
            ...(cell.offset > 0.5 ? [emit(spacer('row', { size: cell.offset - plan.columnGap }))] : []),
            convertChild(elements[cell.index], { cellWidth: cell.width }),
          ]),
        }))
      }
    } else if (layout.kind === 'table' || layout.kind === 'section') {
      // rows stack; a calendar spaces its weeks with a margin on each row, which the usual margin step carries
      axis = 'column'
      frame['flex-direction'] = 'column'
      children = elements.map((child) => convertChild(child))
    } else if (layout.kind === 'table-row') {
      note('approximated', node, 'table row drawn as a flex row with measured cell widths')
      marginItems = []
      children = elements.map((child) => convertChild(child, { cellWidth: child.rect.w }))
    } else {
      // Normal flow. Blocks stack; inline content sits in a line.
      const inline = elements.filter((child) => isInlineLevel(child.used.display))
      const stacked = elements.length > 0 && inline.length === 0 && runs.length === 0
      if (stacked) {
        axis = 'column'
        collapse = true
        frame['flex-direction'] = 'column'
        children = elements.map((child) => convertChild(child))
      } else if (!elements.length) {
        // only text, but the element has a box (padding, a fill, a fixed height): a frame holding one text layer
        axis = 'column'
        frame['flex-direction'] = 'column'
        // a <button> centres its label vertically on its own; a block does not
        if (node.tag === 'button' || node.used.display === 'table-cell') frame['justify-content'] = node.used.verticalAlign === 'top' ? 'flex-start' : 'center'
        marginItems = []
        // Text the browser cut short with "…": Paper only truncates a left-aligned line in a box of fixed width (a
        // centred one wraps instead), and the "…" fills the box anyway
        const cut = node.truncated && node.used.textOverflow === 'ellipsis'
        if (cut) { size.width = px(node.rect.w); note('approximated', node, 'a label cut short with "…": left-aligned in a box of its measured width (Paper wraps a centred one, and cuts at a word)') }
        children = runs.length ? [textNode(runs.join(' ').trim(), node, textClasses, context, cut ? { 'text-align': undefined } : {})] : []
      } else if (inlineLines(node)) {
        // Inline content over several lines: one row per line the browser drew, so a chip after a wrapped
        // sentence, or a highlight that starts mid-line, stays where it was
        note('approximated', node, 'inline content drawn line by line as the browser broke it (it no longer rewraps)')
        axis = 'column'
        frame['flex-direction'] = 'column'
        marginItems = []
        const lineHeight = num(node.used.lineHeight) || null
        const justify = { center: 'center', right: 'flex-end', end: 'flex-end' }[node.used.textAlign]
        children = inlineLines(node).map((line) => {
          const parts = []
          for (const atom of line.atoms) {
            if (atom.kind === 'item') {
              const converted = inlineItem(atom.child)
              if (converted) parts.push(converted)
              continue
            }
            if (!atom.text.trim()) { if (atom.width > 0.5) parts.push(emit(spacer('row', { size: atom.width }))); continue }
            const run = textNode(atom.text, atom.owner, [...atom.classes, ...textClasses], context, { 'white-space': 'pre' })
            if (!atom.deco) { parts.push(run); continue }
            // a highlight: its fill on every line it covers, its side padding only where it starts and ends, and only
            // as tall as the letters (the browser paints an inline box's fill over its glyphs, not the whole line)
            if (atom.height > 0) run.style['line-height'] = px(atom.height)
            const box = boxStyles(atom.deco, context)
            const pad = sides(atom.deco.used, 'padding').map(num)
            box.padding = shorthand([pad[0], atom.last ? pad[1] : 0, pad[2], atom.first ? pad[3] : 0].map(px))
            // centred in its line, where the browser's half-leading puts the letters
            parts.push(emit({ tag: 'div', name: layerName(atom.deco), style: dropDefaults({ display: 'flex', ...box, 'align-self': 'center' }), children: [run] }))
          }
          return emit({ tag: 'div', name: 'line', style: dropDefaults({ display: 'flex', 'align-items': 'baseline', 'justify-content': justify, 'min-height': lineHeight ? px(lineHeight) : undefined, 'flex-shrink': '0' }), children: parts })
        })
      } else {
        // Mixed inline content (text beside an icon, a bold figure inside a sentence). Paper's
        // text layers hold one style, so each run is its own layer on a wrapping flex line.
        frame['flex-wrap'] = node.used.whiteSpace === 'nowrap' ? 'nowrap' : 'wrap'
        frame['align-items'] = 'baseline'
        frame['justify-content'] = { center: 'center', right: 'flex-end', end: 'flex-end' }[node.used.textAlign]
        const items = flowing.filter((child) => !isText(child) || normalizeText(child.text, node.used.whiteSpace).trim())
        const mixed = inline.length !== elements.length
        if (items.filter(isText).length && items.length > 1) note('approximated', node, `rich text split into ${items.length} one-style runs (it can no longer rewrap as a sentence)`)
        marginItems = []
        children = items.map((child, index) => {
          if (!isText(child)) return inlineItem(child)
          let text = normalizeText(child.text, node.used.whiteSpace)
          if (index === 0) text = text.trimStart()
          if (index === items.length - 1) text = text.trimEnd()
          // the space between two runs lives at the edge of one of them; `pre` stops it collapsing
          // `pre-wrap` keeps the space and still lets a long run break; the cap keeps it inside its line
          return textNode(text, node, textClasses, context, { 'max-width': '100%', ...(/^\s|\s$/.test(text) && node.used.whiteSpace !== 'nowrap' ? { 'white-space': 'pre-wrap' } : /^\s|\s$/.test(text) ? { 'white-space': 'pre' } : {}) })
        })
        if (mixed) {
          // Blocks and inline content in one container: each block is a line of its own, and each run of
          // inline things between blocks shares a line (a label above the button it describes).
          const lineStyle = { display: 'flex', 'flex-wrap': frame['flex-wrap'], 'align-items': 'baseline', 'justify-content': frame['justify-content'] }
          const lines = []
          const sources = []
          items.forEach((child, position) => {
            const blockLevel = !isText(child) && !isInlineLevel(child.used.display)
            const last = lines.at(-1)
            if (blockLevel) { lines.push(children[position]); sources.push(child) }
            else if (last?.line) last.children.push(children[position])
            else { lines.push(emit({ tag: 'div', name: 'line', line: true, style: dropDefaults(lineStyle), children: [children[position]] })); sources.push({ text: '' }) }
          })
          // a block's own margins (the 8px under a label) still space the lines
          marginItems = sources
          collapse = true
          // a line holding one thing is just that thing
          children = lines.map((line) => (line.line && line.children.length === 1 ? Object.assign(line.children[0], { style: { ...line.children[0].style, 'align-self': line.children[0].style['align-self'] ?? 'flex-start' } }) : line))
          axis = 'column'
          frame['flex-direction'] = 'column'
          delete frame['flex-wrap']
          delete frame['align-items']
          delete frame['justify-content']
        }
      }
    }

    // Margins on the in-flow children, rewritten in the parent's terms.
    let extraPadding
    let traced = false
    if (marginItems.length) {
      const moved = translateMargins({ axis, gap, collapse }, marginItems.map((child) => ({ margin: isText(child) ? { top: 0, right: 0, bottom: 0, left: 0 } : marginOf(child) })))
      for (const entry of moved.align) if (!children[entry.index].raw) children[entry.index].style['align-self'] = entry.value
      const boxes = marginItems.every((child) => !isText(child))
      if (moved.negative && boxes) {
        // Overlapping children (a stack of avatars pulled together with a negative margin) have no flex
        // spelling. Trace them: each child sits where the browser put it, inside a frame of the measured size.
        note('approximated', node, 'children overlap (negative margin): placed by measured position')
        marginItems.forEach((child, position) => {
          const target = children[position]
          const place = { position: 'absolute', left: px(child.rect.x - node.rect.x - num(node.used.borderLeftWidth)), top: px(child.rect.y - node.rect.y - num(node.used.borderTopWidth)), width: px(child.rect.w), height: px(child.rect.h) }
          if (target.raw) target.raw = target.raw.replace(/style="/, `style="${Object.entries(place).map(([property, value]) => `${property}:${value}`).join(';')};`)
          else Object.assign(target.style, place)
        })
        // where they overlap, a positioned child with a z-index is on top in the browser (a raised row of tabs over
        // the box below it); Paper stacks by layer order, so the layers follow the z-index (a stable sort)
        children = byStacking(marginItems.map((child, position) => ({ child, node: children[position] }))).map((entry) => entry.node)
        traced = true
      } else {
        extraPadding = moved.padding
        for (const reason of moved.lost) note('approximated', node, reason)
        for (const wrap of moved.wraps) {
          const inner = children[wrap.index]
          let wrapper = inner.wrapper
          if (!wrapper) {
            wrapper = emit({ tag: 'div', name: 'margin', wrapper: true, style: { display: 'flex', 'flex-direction': axis === 'column' ? 'column' : 'row' }, children: [inner] })
            // the frame takes the child's place in the line: its growth and its own alignment move out with it
            const role = inner.raw ? {} : inner.style
            for (const property of ['flex-grow', 'flex-shrink', 'flex-basis', 'align-self']) if (role[property] !== undefined) { wrapper.style[property] = role[property]; delete role[property] }
            if (Number(wrapper.style['flex-grow']) > 0) role['flex-grow'] = '1'
          }
          wrapper.style[`padding-${wrap.side}`] = px(wrap.size)
          inner.wrapper = wrapper
        }

        // `mt-auto` pushes a card's footer to the bottom: the footer sits at the far end of a wrapper that takes the free space
        for (const entry of moved.spacers.filter((candidate) => candidate.grow)) {
          const inner = children[entry.of]
          const leading = entry.edge === 'top' || entry.edge === 'left'
          const wrapper = inner.wrapper ?? emit({ tag: 'div', name: 'push', wrapper: true, style: { display: 'flex', 'flex-direction': axis === 'column' ? 'column' : 'row', 'flex-grow': '1' }, children: [inner] })
          // pushed from both sides is centred
          wrapper.style['justify-content'] = wrapper.style['justify-content'] && wrapper.style['justify-content'] !== (leading ? 'flex-end' : 'flex-start') ? 'center' : leading ? 'flex-end' : 'flex-start'
          wrapper.style['flex-grow'] = '1'
          inner.wrapper = wrapper
        }
        children = children.map((child) => child.wrapper ?? child)
        for (const entry of moved.spacers.filter((candidate) => !candidate.grow).sort((a, b) => b.before - a.before)) children.splice(entry.before, 0, emit(spacer(axis, entry)))
      }
    }

    // Paper stacks by layer order and has no z-index: later is on top
    const stack = (child) => (child.used.zIndex === 'auto' ? 0 : Number(child.used.zIndex))
    // An ::after paints over the in-flow children, unless every one of them is positioned with a higher z-index:
    // a calendar's range-end cell bridges into the band with an ::after that the day button (z-10) covers.
    const inFlow = node.children.filter((child) => !floating.includes(child))
    const coveredBy = (pseudo) => inFlow.length > 0 && inFlow.every((child) => !isText(child) && child.used.position !== 'static' && stack(child) > stack(pseudo))
    for (const pseudo of node.pseudo ?? []) {
      const pseudoNode = convert({ ...pseudo, tag: 'div', classes: [], children: pseudo.content ? [{ text: pseudo.content }] : [], slot: `::${pseudo.which}` }, childContext)
      // an underline that only shows on the active tab is fully transparent on the others: nothing to draw
      if (!pseudoNode) continue
      if (pseudo.which === 'before' || coveredBy(pseudo)) children.unshift(pseudoNode)
      else children.push(pseudoNode)
      note('approximated', node, `::${pseudo.which} drawn as a real layer`)
    }
    const behind = [...floating].filter((child) => stack(child) < 0).sort((a, b) => stack(a) - stack(b))
    const above = [...floating].filter((child) => stack(child) >= 0).sort((a, b) => stack(a) - stack(b))
    children.unshift(...behind.map((child) => convertChild(child)).filter(Boolean))
    children.push(...above.map((child) => convertChild(child)).filter(Boolean))

    frame = { ...frame, ...boxStyles(node, context, extraPadding), ...size }
    // a table cell centres whatever it holds, top to bottom
    if (node.used.display === 'table-cell' && node.used.verticalAlign === 'middle') {
      if (frame['flex-direction'] === 'column') frame['justify-content'] = 'center'
      else frame['align-items'] = 'center'
    }
    if (traced) Object.assign(frame, { position: frame.position ?? 'relative', width: px(node.rect.w), height: px(node.rect.h) })
    // A gradient edge: the frame keeps the gradient (Paper paints it under the transparent border) and an inset
    // layer carries the fill the browser clipped to the padding box, with the corners the padding box has.
    const edge = !clipsToText(node.used) && edgeOf(node.used)
    if (edge) {
      const corners = [['TopLeft', 0, 3], ['TopRight', 0, 1], ['BottomRight', 2, 1], ['BottomLeft', 2, 3]].map(([corner, a, b]) => {
        const outer = num(node.used[`border${corner}Radius`])
        if (outer >= 9999 || outer >= Math.max(node.rect.w, node.rect.h)) return '9999px'
        return binder.length('radius', Math.max(0, outer - Math.max(edge.widths[a], edge.widths[b])), { count: false })
      })
      const fill = emit({ tag: 'div', name: 'edge fill', style: dropDefaults({ display: 'flex', position: 'absolute', left: '0px', top: '0px', width: '100%', height: '100%', 'border-radius': shorthand(corners), 'background-image': binder.colorsIn(edge.inner.map((layer) => shownPart(layer)).join(', ')) }), children: [] })
      // Paper paints a positioned layer above every unpositioned sibling (CSS's painting order): the content is
      // positioned too, so that it stays above the fill
      for (const child of children) {
        if (child.raw) { if (!/^<\w+[^>]*style="[^"]*position:/.test(child.raw)) child.raw = child.raw.replace(/style="/, 'style="position:relative;') }
        else child.style.position ??= 'relative'
      }
      children.unshift(fill)
      frame.position = frame.position ?? 'relative'
      note('approximated', node, 'gradient edge: the frame carries the border gradient, an inset "edge fill" layer the fill the browser clipped inside the border')
    }
    // Paper keeps a gradient but drops background-size, so a gradient stretched wider than its box (the usage
    // meter shows the first 30 % of a full-width AI gradient) would be squeezed in whole. Draw it as a child
    // layer of the stated size, clipped by this frame.
    const stretched = frame['background-image'] && node.used.backgroundRepeat === 'no-repeat' && node.used.backgroundSize.match(/^([\d.]+)% ([\d.]+)%$/)
    if (stretched && (Number(stretched[1]) !== 100 || Number(stretched[2]) !== 100)) {
      children.unshift(emit({ tag: 'div', name: 'gradient', style: { display: 'flex', position: 'absolute', left: '0px', top: '0px', width: `${round(Number(stretched[1]))}%`, height: `${round(Number(stretched[2]))}%`, 'background-image': frame['background-image'] }, children: [] }))
      for (const property of ['background-image', 'background-size', 'background-position', 'background-repeat']) delete frame[property]
      frame.overflow = 'hidden'
      frame.position = frame.position ?? 'relative'
      note('approximated', node, 'background-size is not kept by Paper: the gradient is a clipped child layer')
    }
    // Paper drops an absolutely positioned child unless its parent is positioned, as CSS does
    if (floating.length && !frame.position) frame.position = 'relative'
    return emit({ tag: 'div', name: layerName(node), style: dropDefaults(frame), children })
  }

  // how far anything pinned to the window reaches, so the root can be made big enough to hold it
  const reached = { right: 0, bottom: 0 }
  const reach = (right, bottom) => { reached.right = Math.max(reached.right, right); reached.bottom = Math.max(reached.bottom, bottom) }
  const root = convert(tree, { textClasses: [], isRoot: true, parentRect: tree.rect, windowShift: tree.origin ?? { x: 0, y: 0 }, reach })
  if (!root.raw && (reached.bottom > tree.rect.h + 0.5 || reached.right > tree.rect.w + 0.5)) {
    if (reached.bottom > tree.rect.h + 0.5) root.style['min-height'] = px(reached.bottom)
    if (reached.right > tree.rect.w + 0.5) root.style['min-width'] = px(reached.right)
    note('approximated', tree, 'something pinned to the browser window (position: fixed) is placed inside the piece, which is made big enough to hold it')
  }
  const approximated = [...notes.approximated].map(([node, reasons]) => ({ node: label(node), reasons }))
  return {
    root,
    stats: {
      nodes: stats.nodes,
      approximated: approximated.length,
      approximations: approximated,
      lost: notes.lost,
      bound: binder.stats.bound,
      bindable: binder.stats.bindable,
      bindingRate: binder.stats.bindable ? round(binder.stats.bound / binder.stats.bindable, 3) : 1,
      unbound: binder.stats.unbound,
    },
  }
}

// ------------------------------------------------------------------ Paper nodes → HTML

export function serialize(node, { children = true } = {}) {
  if (node.raw) return node.raw
  const css = Object.entries(node.style).map(([property, value]) => `${property}:${value}`).join(';')
  const name = node.name ? ` layer-name="${escapeAttr(node.name)}"` : ''
  const inner = node.text !== undefined ? escapeText(node.text) : children ? node.children.map((child) => serialize(child)).join('') : ''
  return `<${node.tag}${name} style="${escapeAttr(css)}">${inner}</${node.tag}>`
}

/**
 * A captured node's children in the order Paper holds their layers: document order, except that children pulled
 * over each other by a negative margin are traced and stacked as the browser paints them (see `byStacking`).
 */
export function paintOrder(node) {
  const children = node.children ?? []
  const inFlow = children.filter((child) => !(isText(child) && !child.text.trim()) && !(!isText(child) && outOfFlow(child)))
  const overlapping = inFlow.length > 1 && inFlow.every((child) => !isText(child)) && inFlow.some((child) => Object.values(marginOf(child)).some((value) => value < 0))
  return overlapping ? [...byStacking(inFlow.map((child) => ({ child }))).map((entry) => entry.child), ...children.filter((child) => !inFlow.includes(child))] : children
}

/** The visible text of a captured tree, in order: what Paper's text layers should read. */
export function visibleTexts(tree) {
  const texts = []
  const walk = (node, whiteSpace) => {
    if (isText(node)) { const text = normalizeText(node.text, whiteSpace).replace(/\s+/g, ' ').trim(); if (text) texts.push(text); return }
    // fully transparent: Paper draws nothing for it, and neither does the browser
    if (node.ghost || (node !== tree && num(node.used.opacity) === 0)) return
    if (FIELDS.has(node.tag)) { const shown = node.textless ? '' : node.value || node.placeholder; if (shown?.trim()) texts.push(shown.replace(/\s+/g, ' ').trim()); return }
    // drawn line by line: one text layer per piece of a line, as the converter makes them
    const lines = inlineLines(node)
    if (lines) {
      for (const atom of lines.flatMap((line) => line.atoms)) {
        if (atom.kind === 'item') walk(atom.child, node.used.whiteSpace)
        else if (atom.text.trim()) texts.push(atom.text.replace(/\s+/g, ' ').trim())
      }
      // what floats beside the lines is drawn after them
      for (const child of node.children.filter((candidate) => !isText(candidate) && outOfFlow(candidate))) walk(child, node.used.whiteSpace)
      return
    }
    for (const child of paintOrder(node)) walk(child, node.used.whiteSpace)
  }
  walk(tree, 'normal')
  return texts
}

// ------------------------------------------------------------------ the browser half

/* The properties read from the browser. `used` are resolved values (px, rgb); `spec` are
   the values the cascade asked for (`auto`, `100%`), which is how a rule is told from a result. */
const USED = ['display', 'position', 'visibility', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent', 'alignSelf', 'alignContent', 'justifyItems', 'flexGrow', 'flexShrink', 'columnGap', 'rowGap', 'gridTemplateColumns',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'overflowX', 'overflowY', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat', 'backgroundClip',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius', 'boxShadow', 'opacity', 'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'color', 'textAlign', 'whiteSpace', 'textTransform', 'textDecorationLine', 'textOverflow', 'fontVariationSettings', 'fontVariantNumeric',
  'verticalAlign', 'transform', 'zIndex', 'clipPath', 'maskImage', 'filter', 'backdropFilter', 'objectFit', 'rotate', 'scale', 'translate', 'aspectRatio']
const SPEC = { width: 'width', height: 'height', minWidth: 'min-width', maxWidth: 'max-width', minHeight: 'min-height', maxHeight: 'max-height', flexBasis: 'flex-basis', marginTop: 'margin-top', marginRight: 'margin-right', marginBottom: 'margin-bottom', marginLeft: 'margin-left', top: 'top', right: 'right', bottom: 'bottom', left: 'left', gridTemplateRows: 'grid-template-rows' }

/** What an open overlay looks like in the DOM: a panel rendered outside the story, in a portal. */
export const PANELS = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="tooltip"], [data-slot$="-content"], [data-slot$="-popup"], [data-sonner-toast]'
const MAX_IMAGE_BYTES = 1_500_000

/* Runs inside the page. Self-contained: it cannot see anything in this module but its arguments. */
async function captureInPage({ usedProperties, specProperties, panelSelector, breakMark, maxImageBytes, unwrap }) {
  const wrapper = document.querySelector('#storybook-root > div')
  // the same element the Figma visual diff shoots: the theme wrapper's one real child, without the canvas padding
  const kids = [...(wrapper?.children ?? [])].filter((element) => !element.matches('section[aria-label], ol[data-sonner-toaster]'))
  let target = kids.length === 1 ? kids[0] : wrapper
  if (!target) return { roots: [], images: {}, unread: [] }
  // A story may stand its piece in a tall, empty box to leave room for a menu that opens above it (the prompt
  // composer sits in an 850px one). The box is the story's staging, not the piece. Only for pieces whose config
  // says `staged`: elsewhere a tall bare wrapper is the layout itself (an app shell filling the window).
  let staged = false
  while (unwrap) {
    const only = [...target.children].filter((element) => element.getBoundingClientRect().height > 0)
    const style = getComputedStyle(target)
    const bare = style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.backgroundImage === 'none' && style.boxShadow === 'none' && parseFloat(style.borderTopWidth) === 0
    const ownText = [...target.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.data.trim())
    if (only.length !== 1 || !bare || ownText || target.getBoundingClientRect().height - only[0].getBoundingClientRect().height < 160) break
    target = only[0]
    staged = true
  }
  const trim = (value) => Math.round(value * 100) / 100
  const urls = new Set()
  let rootOrigin = { x: 0, y: 0 }

  const hidden = (element, computed) => {
    // never drawn, whatever their computed display says (<noscript> reports `inline` while scripts run)
    if (element.matches('noscript, script, style, template, link, meta, title')) return true
    if (computed.display === 'none' || computed.visibility === 'hidden' || computed.visibility === 'collapse' || element.hasAttribute('hidden')) return true
    const box = element.getBoundingClientRect()
    // screen-reader-only text: clipped to nothing, or squeezed into one pixel
    if (computed.clipPath === 'inset(50%)') return true
    if (computed.position !== 'static' && box.width <= 1 && box.height <= 1 && computed.overflowX !== 'visible') return true
    // an empty, sizeless, out-of-flow element (a live region waiting for a message) draws nothing and moves nothing
    if ((computed.position === 'absolute' || computed.position === 'fixed') && box.width * box.height === 0 && !element.childNodes.length) return true
    return false
  }
  // the real <input> behind a drawn checkbox, switch or radio: there for forms and screen readers, never seen.
  // It can still sit in the layout (and so count for a gap), which is why it is not simply dropped.
  const unseenField = (element, computed) => element.matches('input, select, textarea') && (element.type === 'hidden' || element.getAttribute('aria-hidden') === 'true' || computed.opacity === '0')

  const SHAPES = 'path, circle, rect, line, polyline, polygon, ellipse, text, tspan, use'
  const svgMarkup = (svg, computed) => {
    const clone = svg.cloneNode(true)
    const originals = [svg, ...svg.querySelectorAll('*')]
    const copies = [clone, ...clone.querySelectorAll('*')]
    const stated = (element, attribute) => { for (let at = element; at && at !== svg.parentElement; at = at.parentElement) { const value = at.getAttribute?.(attribute); if (value) return value } return null }
    originals.forEach((original, index) => {
      const copy = copies[index]
      const style = getComputedStyle(original)
      if (index > 0 && (style.display === 'none' || style.visibility === 'hidden')) { copy.setAttribute('data-paper-drop', ''); return }
      for (const attribute of [...copy.attributes]) if (/^(class|role|focusable|style|tabindex|aria-|data-(?!paper-drop))/.test(attribute.name)) copy.removeAttribute(attribute.name)
      if (original.matches('stop')) {
        // Paper does not resolve var() inside a gradient stop, so stops are written as literal colours
        copy.setAttribute('stop-color', style.stopColor)
        if (style.stopOpacity !== '1') copy.setAttribute('stop-opacity', style.stopOpacity)
      } else if (original.matches(SHAPES)) {
        for (const paint of ['fill', 'stroke']) {
          const attribute = stated(original, paint)
          const value = style[paint]
          if (value === 'none') { if (paint === 'fill' || attribute) copy.setAttribute(paint, 'none'); continue }
          if (value.startsWith('url(')) { copy.setAttribute(paint, value.replace(/"/g, '')); continue }
          // an icon inherits the text colour; keep that link so it can bind to the text's token
          copy.setAttribute(paint, attribute === 'currentColor' || value === computed.color ? 'currentColor' : value)
        }
        if (style.stroke !== 'none') {
          copy.setAttribute('stroke-width', String(parseFloat(style.strokeWidth)))
          if (style.strokeDasharray !== 'none') copy.setAttribute('stroke-dasharray', style.strokeDasharray.replace(/px/g, ''))
          if (style.strokeLinecap !== 'butt') copy.setAttribute('stroke-linecap', style.strokeLinecap)
        }
        // Paper ignores fill-opacity and stroke-opacity (an area chart came out solid), so the alpha goes into the colour
        for (const paint of ['fill', 'stroke']) {
          const alpha = parseFloat(style[`${paint}Opacity`])
          const channels = (copy.getAttribute(paint) ?? '').match(/^rgba?\(([^)]+)\)$/)?.[1].split(/[\s,/]+/).filter(Boolean).map(Number)
          if (alpha < 1 && channels?.length >= 3) { copy.setAttribute(paint, `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${Math.round((channels[3] ?? 1) * alpha * 1000) / 1000})`); copy.removeAttribute(`${paint}-opacity`) }
        }
        if (style.opacity !== '1') copy.setAttribute('opacity', style.opacity)
        if (original.matches('text')) {
          // chart labels are styled by CSS classes that do not travel; write what they resolved to
          copy.setAttribute('font-family', style.fontFamily.split(',')[0].replace(/["']/g, '').trim())
          copy.setAttribute('font-size', String(parseFloat(style.fontSize)))
          if (style.fontWeight !== '400') copy.setAttribute('font-weight', style.fontWeight)
          if (style.textAnchor !== 'start') copy.setAttribute('text-anchor', style.textAnchor)
        }
      }
    })
    for (const dropped of clone.querySelectorAll('[data-paper-drop]')) dropped.remove()
    for (const paint of ['fill', 'stroke']) clone.removeAttribute(paint)
    const box = svg.getBoundingClientRect()
    clone.setAttribute('width', String(trim(box.width)))
    clone.setAttribute('height', String(trim(box.height)))
    // a chart draws past its viewBox (axis labels); an icon never does
    if (computed.overflowX === 'visible' && svg.querySelector('text')) clone.setAttribute('overflow', 'visible')
    return clone.outerHTML
  }

  const capture = (rootElement, part) => {
    rootElement.setAttribute('data-paper-root', part)
    const origin = rootElement.getBoundingClientRect()
    rootOrigin = { x: Math.round(origin.x * 100) / 100, y: Math.round(origin.y * 100) / 100 }
    const read = (computed, map, element) => {
      const used = Object.fromEntries(usedProperties.map((property) => [property, computed[property]]))
      const spec = {}
      if (map) for (const [key, property] of Object.entries(specProperties)) spec[key] = map.get(property)?.toString() ?? 'auto'
      const box = element?.getBoundingClientRect()
      for (const [, url] of (used.backgroundImage ?? '').matchAll(/url\("([^"]+)"\)/g)) urls.add(url)
      return { used, spec, rect: box ? { x: trim(box.x - origin.x), y: trim(box.y - origin.y), w: trim(box.width), h: trim(box.height) } : { x: 0, y: 0, w: 0, h: 0 } }
    }
    const pseudoOf = (element) => {
      const found = []
      for (const which of ['before', 'after']) {
        const computed = getComputedStyle(element, `::${which}`)
        if (!computed.content || computed.content === 'none' || computed.content === 'normal' || computed.display === 'none') continue
        const captured = read(computed, null, null)
        // a pseudo-element has no box to measure; its stated size and offsets are the best there is
        captured.spec = Object.fromEntries(Object.keys(specProperties).map((key) => [key, computed[key] || 'auto']))
        const size = { w: parseFloat(computed.width) || 0, h: parseFloat(computed.height) || 0 }
        const text = computed.content.startsWith('"') || computed.content.startsWith("'") ? computed.content.slice(1, -1) : ''
        // nothing to draw: no text, no fill, no border, no size
        const painted = computed.backgroundColor !== 'rgba(0, 0, 0, 0)' || computed.backgroundImage !== 'none' || parseFloat(computed.borderTopWidth) > 0 || parseFloat(computed.borderBottomWidth) > 0 || parseFloat(computed.borderLeftWidth) > 0 || parseFloat(computed.borderRightWidth) > 0
        if (!text && !(painted && size.w > 0 && size.h > 0)) continue
        const parent = element.getBoundingClientRect()
        const left = parseFloat(computed.left)
        const top = parseFloat(computed.top)
        captured.rect = { x: trim(parent.x - origin.x + (Number.isFinite(left) ? left : 0)), y: trim(parent.y - origin.y + (Number.isFinite(top) ? top : 0)), ...size }
        found.push({ which, content: text, ...captured })
      }
      return found
    }
    // Where the browser broke a text node into lines: one piece per line, measured word by word. Paper cannot wrap
    // a run around something that sits beside it, so a paragraph with a chip or a highlight in it is drawn from these.
    const range = document.createRange()
    const fragmentsOf = (textNode) => {
      const pieces = []
      for (const match of textNode.data.matchAll(/\S+|\s+/g)) {
        range.setStart(textNode, match.index)
        range.setEnd(textNode, match.index + match[0].length)
        const boxes = [...range.getClientRects()].filter((box) => box.width > 0 || box.height > 0)
        const last = pieces.at(-1)
        // collapsed white space has no box: it belongs to the piece before it
        if (!boxes.length) { if (last) last.text += match[0]; continue }
        if (last && Math.abs(boxes[0].top - last.top) < Math.max(2, boxes[0].height / 2)) { last.text += match[0]; last.right = Math.max(last.right, boxes.at(-1).right); continue }
        pieces.push({ text: match[0], top: boxes[0].top, left: boxes[0].left, right: boxes.at(-1).right, height: boxes[0].height })
      }
      return pieces.map((piece) => ({ text: piece.text, x: trim(piece.left - origin.x), y: trim(piece.top - origin.y), w: trim(piece.right - piece.left), h: trim(piece.height) }))
    }
    const walk = (element) => {
      const computed = getComputedStyle(element)
      if (hidden(element, computed)) return null
      const tag = element.tagName.toLowerCase()
      const node = {
        tag,
        slot: element.getAttribute('data-slot'),
        role: element.getAttribute('role'),
        classes: typeof element.className === 'string' ? element.className.split(/\s+/).filter(Boolean) : [],
        ...read(computed, element.computedStyleMap(), element),
        children: [],
        pseudo: tag === 'svg' || tag === 'img' ? [] : pseudoOf(element),
      }
      // the size before any rotation (the measured rect is the rotated bounding box)
      if (element.offsetWidth !== undefined) node.box = [element.offsetWidth, element.offsetHeight]
      // how far a transform slid it from where the layout put it (offsetLeft ignores transforms, the rect does not)
      const slid = (computed.translate !== 'none' || computed.transform !== 'none') && computed.rotate === 'none' && !/^matrix\((?!1, 0, 0, 1,)/.test(computed.transform)
      if (slid && element.offsetParent && computed.position !== 'fixed') {
        const parent = element.offsetParent.getBoundingClientRect()
        const box = element.getBoundingClientRect()
        node.shift = [trim(box.x - (parent.x + element.offsetParent.clientLeft + element.offsetLeft)), trim(box.y - (parent.y + element.offsetParent.clientTop + element.offsetTop))]
      }
      // `sticky` keeps its place in the layout but is drawn where it stuck (a chat's composer at the window's bottom
      // edge, over the thread): measured against where it would sit unstuck, it is an in-flow layer slid over, as above
      if (computed.position === 'sticky') {
        const stuck = element.getBoundingClientRect()
        const was = element.style.position
        element.style.position = 'static'
        const flow = element.getBoundingClientRect()
        element.style.position = was
        if (Math.abs(stuck.x - flow.x) > 0.5 || Math.abs(stuck.y - flow.y) > 0.5) node.shift = [trim(stuck.x - flow.x), trim(stuck.y - flow.y)]
      }
      if (unseenField(element, computed)) { node.ghost = true; return node }
      if (tag === 'svg') { node.svg = svgMarkup(element, computed); return node }
      if (tag === 'img') { node.src = element.currentSrc || element.src; node.alt = element.alt; if (node.src) urls.add(node.src); return node }
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        node.textless = tag === 'input' && ['checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(element.type)
        node.value = tag === 'select' ? element.selectedOptions[0]?.textContent ?? '' : element.type === 'password' ? '•'.repeat(element.value.length) : element.value
        node.placeholder = element.getAttribute('placeholder')
        node.placeholderColor = getComputedStyle(element, '::placeholder').color
        return node
      }
      // a one-line label the browser cut short with "…" (its text is wider than its box)
      if (computed.textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth + 1) node.truncated = true
      const append = (text, frags = []) => {
        const last = node.children.at(-1)
        if (!(last && typeof last.text === 'string')) { node.children.push({ text, frags }); return }
        last.text += text
        // the second node's first piece continues the first node's last line
        const [head, ...rest] = frags
        if (head && last.frags.length && Math.abs(last.frags.at(-1).y - head.y) < 2) { const end = last.frags.at(-1); end.text += head.text; end.w = trim(head.x + head.w - end.x) } else if (head) last.frags.push(head)
        last.frags.push(...rest)
      }
      for (const child of element.childNodes) {
        // React writes `of {total}` as two text nodes; to the reader, and to Paper, they are one run
        if (child.nodeType === Node.TEXT_NODE) append(child.data, fragmentsOf(child))
        else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === 'BR') { append(breakMark); continue }
          const captured = walk(child)
          if (!captured) continue
          // `display: contents` has no box: its children belong to this element's layout
          if (captured.used.display === 'contents') node.children.push(...captured.children)
          else node.children.push(captured)
        }
      }
      return node
    }
    const tree = walk(rootElement)
    // where the root sits in the window: what `position: fixed` descendants were measured against
    if (tree && part === 'main') tree.origin = rootOrigin
    return tree
  }

  const roots = []
  const main = capture(target, 'main')
  if (main) {
    const canvas = getComputedStyle(wrapper)
    // "fills" means: the canvas spans the window and the piece spans the canvas. A centred layout shrinks the canvas to the piece instead.
    const spansWindow = wrapper.getBoundingClientRect().width >= (wrapper.parentElement?.clientWidth ?? document.documentElement.clientWidth) - 1
    main.fillsCanvas = staged || spansWindow && target.getBoundingClientRect().width >= wrapper.clientWidth - parseFloat(canvas.paddingLeft) - parseFloat(canvas.paddingRight) - 1
    roots.push({ part: 'main', tree: main })
  }
  // open overlays: panels portalled outside the story. The outermost match is the panel; its insides come with it.
  // The matched element can be the panel's contents with the painted shell around it (a navigation menu's
  // card is an unnamed <nav> two levels up). Climb while the parent is the same box: the outermost is the panel.
  const painted = (element) => { const style = getComputedStyle(element); return style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none' || style.boxShadow !== 'none' || parseFloat(style.borderTopWidth) > 0 }
  const shellOf = (element) => {
    let shell = element
    // a match that paints itself (a tooltip, a dialog) IS the panel: only bare contents look outward for their shell
    if (painted(shell)) return shell
    for (let parent = shell.parentElement; parent && parent !== document.body && !parent.contains(target); parent = parent.parentElement) {
      const [inner, outer] = [shell.getBoundingClientRect(), parent.getBoundingClientRect()]
      if (Math.abs(outer.width - inner.width) > 1 || Math.abs(outer.height - inner.height) > 1) break
      shell = parent
      if (painted(shell)) break
    }
    return shell
  }
  const panels = [...new Set([...document.querySelectorAll(panelSelector)].filter((element) => !target.contains(element) && !element.parentElement?.closest(panelSelector)).map(shellOf))]
  panels.forEach((panel, index) => {
    const tree = capture(panel, `panel-${index + 1}`)
    if (!tree || tree.rect.w * tree.rect.h === 0) return
    // a panel's width comes from its anchor or the window, neither of which exists in Paper
    tree.fillsCanvas = true
    roots.push({ part: `panel-${index + 1}`, tree })
  })

  const images = {}
  for (const url of urls) {
    try {
      if (url.startsWith('data:')) { if (url.length <= maxImageBytes * 1.4) images[url] = url; continue }
      const blob = await (await fetch(url)).blob()
      if (blob.size > maxImageBytes) continue
      images[url] = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob) })
    } catch { /* another origin that does not allow reading: the caller photographs the element instead */ }
  }
  // images the page shows but script may not read (another site's avatar): mark them so they can be photographed
  const unread = []
  for (const element of document.querySelectorAll('[data-paper-root] img, img[data-paper-root]')) {
    const url = element.currentSrc || element.src
    if (!url || images[url] || !element.complete || !element.naturalWidth) continue
    element.setAttribute('data-paper-image', String(unread.length))
    unread.push(url)
  }
  return { roots, images, unread }
}

/** How a story's render ended, read from Storybook's own preview: `completed`, `errored`, … or null when it cannot be read. */
const renderPhase = () => window.__STORYBOOK_PREVIEW__?.currentRender?.phase ?? null
const ENDED = ['completed', 'finished', 'errored', 'aborted']

/**
 * Open a story the way the Figma visual diff does (Dawn, motion frozen, fonts loaded) and leave the page on
 * its END state: a story with a play function (one that types, clicks or opens something) is read only after
 * the play has finished. A story that ends in an error (a failed render, a play function that threw) is a
 * failure: it throws rather than have its error screen drawn into Paper.
 */
export async function openStory(page, storyId, base = STORYBOOK) {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(`${base}/iframe.html?viewMode=story&id=${storyId}&globals=theme:light`, { waitUntil: 'domcontentloaded' })
  // either the story drew something or Storybook put up its error screen
  await page.waitForFunction(() => document.querySelector('#storybook-root')?.children.length > 0 || document.body.classList.contains('sb-show-errordisplay') || document.body.classList.contains('sb-show-nopreview'), null, { timeout: 60000 })
  // the play function runs after the first render; a long one (a dozen keystrokes and waits) takes a few seconds
  const phase = await page.waitForFunction((ended) => { const now = window.__STORYBOOK_PREVIEW__?.currentRender?.phase; return now === undefined || now === null ? 'unknown' : ended.includes(now) ? now : false }, ENDED, { timeout: 30000 }).then((handle) => handle.jsonValue()).catch(() => 'timeout')
  const failure = await storyFailure(page)
  if (failure || phase === 'errored') throw new Error(`${storyId}: the story ended in an error${failure ? ` (${failure})` : ' (its play function threw)'}`)
  if (phase === 'timeout') throw new Error(`${storyId}: the story's play function had not finished after 30s (stuck at "${await page.evaluate(renderPhase)}")`)
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' })
  // one more beat for whatever the last interaction set moving (a menu mounting, a toast sliding in)
  await page.waitForTimeout(phase === 'unknown' ? 1500 : 600)
}

/** Storybook's error screen, as a one-line message; null when the story is showing. */
export async function storyFailure(page) {
  return page.evaluate(() => {
    if (!document.body.classList.contains('sb-show-errordisplay') && !document.body.classList.contains('sb-show-nopreview')) return null
    const text = (document.querySelector('#error-message')?.textContent ?? document.querySelector('.sb-nopreview')?.textContent ?? 'the story threw').replace(/\s+/g, ' ').trim()
    return text.slice(0, 160) || 'the story threw'
  })
}

/* In the page: the open panels outside the story's own element (the same test `captureInPage` applies). */
const visiblePanels = (selector) => {
  const wrapper = document.querySelector('#storybook-root > div')
  const kids = [...(wrapper?.children ?? [])].filter((element) => !element.matches('section[aria-label], ol[data-sonner-toaster]'))
  const target = kids.length === 1 ? kids[0] : wrapper
  return [...document.querySelectorAll(selector)].filter((element) => !target?.contains(element) && element.getBoundingClientRect().width > 0).length
}
const panelCount = (page) => page.evaluate(visiblePanels, PANELS)

/**
 * Open a piece that is closed until used. `hint` is `{ click | hover | focus | context: selector }`
 * or `{ key, modifiers }`. Returns how the open state was reached: `story` (it rendered open),
 * `click`/`hover`/… (this function did it), or `closed` (nothing opened: the caller records that).
 */
export async function openOverlay(page, hint, storyId = null) {
  if (await panelCount(page)) return 'story'
  if (!hint || (hint.stories && !hint.stories.includes(storyId))) return 'none'
  const [action, selector] = Object.entries(hint).find(([key]) => ['click', 'hover', 'focus', 'context', 'key'].includes(key)) ?? []
  try {
    if (action === 'key') await page.keyboard.press([...(hint.modifiers ?? []), hint.key].join('+'))
    else {
      const target = page.locator(`#storybook-root ${selector}`).first()
      if (action === 'click') await target.click({ timeout: 5000 })
      else if (action === 'hover') await target.hover({ timeout: 5000 })
      else if (action === 'focus') await target.focus({ timeout: 5000 })
      else if (action === 'context') await target.click({ button: 'right', timeout: 5000 })
    }
    // a tooltip waits before it shows; a menu mounts on the next frame
    await page.waitForFunction(visiblePanels, PANELS, { timeout: 4000 })
    await page.waitForTimeout(400)
    return action
  } catch {
    return 'closed'
  }
}

/** The story's trees (the piece itself, then any open panels), plus a 2x PNG of each for the picture check. */
export async function captureStory(page, storyId, { base = STORYBOOK, screenshot = false, open = null, staged = false } = {}) {
  await openStory(page, storyId, base)
  let opened = await openOverlay(page, open, storyId)
  // Opening can take a story down (a menu part used outside its group throws on first render). The page is
  // then Storybook's error screen: read the message, load the story again and draw it closed.
  const crash = await storyFailure(page)
  if (crash) {
    await openStory(page, storyId, base)
    opened = 'crashed'
  }
  const { roots, images, unread } = await page.evaluate(captureInPage, { usedProperties: USED, specProperties: SPEC, panelSelector: PANELS, breakMark: BREAK, maxImageBytes: MAX_IMAGE_BYTES, unwrap: staged })
  if (!roots.length) throw new Error(`${storyId}: the story rendered nothing visible`)
  for (const [position, url] of unread.entries()) {
    try { images[url] = `data:image/png;base64,${(await page.locator(`[data-paper-image="${position}"]`).screenshot({ type: 'png' })).toString('base64')}` } catch { /* stays a placeholder, and is reported */ }
  }
  if (screenshot) {
    // Paper draws all text with grayscale smoothing; without the same here, light-on-dark labels read a weight heavier.
    await page.addStyleTag({ content: '* { -webkit-font-smoothing: antialiased !important; }' })
    // A centred story sits on a fraction of a pixel, which smears every edge by one device pixel against
    // Paper's export. Slide each root onto the pixel grid (a paint-only move: layout is already captured).
    await page.evaluate(() => { for (const target of document.querySelectorAll('[data-paper-root]')) { const box = target.getBoundingClientRect(); target.style.translate = `${Math.round(box.x) - box.x}px ${Math.round(box.y) - box.y}px` } })
    for (const root of roots) root.png = await page.locator(`[data-paper-root="${root.part}"]`).screenshot({ type: 'png' })
  }
  return { roots, images, opened, crash }
}

/**
 * The date every story is drawn and checked on. A story that shows today (the calendar's selected day, a chat
 * list grouped by "Today") would otherwise look different in Storybook every day from what Paper drew, and the
 * check would call it a regression. Only `Date` is fixed; timers and animations run as usual.
 */
export const STORY_DATE = new Date('2026-06-15T12:00:00')

export async function launch() {
  const { chromium } = createRequire(import.meta.url)('playwright')
  const browser = await chromium.launch()
  const page = await browser.newPage({ deviceScaleFactor: SCALE })
  await page.clock.setFixedTime(STORY_DATE)
  return { browser, page }
}

export const quillTokenTable = () => resolveTokens(quillPaperTokens().tokens)

const sum = (list, key) => list.reduce((total, entry) => total + entry[key], 0)

/**
 * A story → `{ parts: [{ part, root, html, texts, size }], stats, opened }`. `parts[0]` is the
 * piece as the story draws it; any others are open panels (a menu, a dialog) drawn beside it.
 */
export async function convertStory(page, storyId, { base = STORYBOOK, tokenTable = quillTokenTable(), screenshot = false, open = null, staged = false } = {}) {
  const { roots, images, opened, crash } = await captureStory(page, storyId, { base, screenshot, open, staged })
  const parts = roots.map(({ part, tree, png }) => {
    const { root, stats } = convertTree(tree, tokenTable, { images })
    return { part, tree, root, html: serialize(root), stats, texts: visibleTexts(tree), size: { width: tree.rect.w, height: tree.rect.h }, png }
  })
  const all = parts.map((part) => part.stats)
  const stats = { nodes: sum(all, 'nodes'), approximated: sum(all, 'approximated'), bound: sum(all, 'bound'), bindable: sum(all, 'bindable'), lost: all.flatMap((entry) => entry.lost), approximations: all.flatMap((entry) => entry.approximations), unbound: Object.assign({}, ...all.map((entry) => entry.unbound)) }
  stats.bindingRate = stats.bindable ? round(stats.bound / stats.bindable, 3) : 1
  return { parts, stats, opened, crash, html: parts.map((part) => part.html).join('\n') }
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2)
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : STORYBOOK
  const storyId = args.find((arg) => !arg.startsWith('--') && arg !== base)
  if (!storyId) { console.error('usage: node scripts/paper/convert.mjs <story-id> [--base http://localhost:6150]'); process.exit(1) }
  const { browser, page } = await launch()
  try {
    const result = await convertStory(page, storyId, { base })
    console.log(result.html)
    console.error(JSON.stringify({ parts: result.parts.map((part) => [part.part, part.size]), opened: result.opened, ...result.stats }, null, 2))
  } finally {
    await browser.close()
  }
}
