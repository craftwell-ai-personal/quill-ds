/**
 * `npm run paper:sync`: bring the Paper file "Quill Design System" in step with the code.
 *
 *   tokens → Foundations page → one page per piece (see ./pieces.mjs)
 *
 * By default only what needs it is written: pieces that are new, failed last time, or
 * whose code has changed since they were drawn; tokens and Foundations when the token
 * source changed. A piece that fails is recorded with its error and the run goes on.
 *
 *   npm run paper:sync                        # what changed
 *   npm run paper:sync -- --all               # everything
 *   npm run paper:sync -- --only button,faq   # these pieces, whatever their state
 *   npm run paper:sync -- --dry-run           # say what would be written; touch nothing
 *   npm run paper:sync -- --prune             # also delete EVERY token in the Paper file that is not Quill's,
 *                                             # including any a person added by hand
 *   npm run paper:sync -- --summary out.json  # also write what happened as JSON (the daily job reads it)
 *   npm run paper:sync -- --create-file       # first run only: make the Paper file
 *
 * Needs the Paper desktop app open on this Mac. Starts its own Storybook (or uses the one
 * at PAPER_STORYBOOK_URL). Exit code 1 when a piece failed.
 */
import { writeFileSync } from 'node:fs'
import { tokensHash } from '../lib/source-hash.mjs'
import { connect, PaperError } from './client.mjs'
import { convertStory, launch, quillTokenTable, serialize } from './convert.mjs'
import { arrangePages, digest, ensureArtboard, FOUNDATIONS, openQuillFile, readState, today, upsertPiece, publicText, removeArtboard, writeState, writeTree } from './file.mjs'
import { ARTBOARD, artboardStyles, frame, header, section } from './page.mjs'
import { inventory, KINDS, pageName, pieceLayerName, selectStories, sourceHash, statusOf, storyTitle, summaryOf } from './pieces.mjs'
import { ensureStorybook } from './storybook.mjs'
import { foundationsHash, syncFoundations } from './sync-foundations.mjs'
import { syncTokens } from './sync-tokens.mjs'
import { isMain } from '../lib/is-main.mjs'

const unique = (list) => [...new Set(list)]
const total = (list, key) => list.reduce((sum, entry) => sum + entry[key], 0)

/** Which pieces a run writes: `only` wins, then `all`, else whatever is not in step. */
export function piecesToSync(pieces, statuses, { all = false, only = [] } = {}) {
  const active = pieces.filter((piece) => !piece.config.declined)
  if (only.length) return active.filter((piece) => only.includes(piece.slug))
  if (all) return active
  const needs = new Set(statuses.filter((entry) => ['pending', 'error', 'stale'].includes(entry.status)).map((entry) => entry.slug))
  return active.filter((piece) => needs.has(piece.slug))
}

/** The record of a piece that has no page: waiting, or declined with its reason. */
export const stubRecord = (piece, previous) => (piece.config.declined
  ? { slug: piece.slug, name: piece.name, kind: piece.kind, status: 'declined', reason: piece.config.declined }
  : previous ?? { slug: piece.slug, name: piece.name, kind: piece.kind, status: 'pending', page: pageName(piece) })

/** One piece: convert its stories, then rewrite its artboard. Returns its record. */
async function syncPiece({ file, page, piece, pageId, previous, index, base, tokenTable }) {
  const chosen = selectStories(piece, index)
  if (!chosen.stories.length) throw new Error(piece.storyFiles.length ? 'no story passes the selection rule: add an `include` in scripts/paper/pieces.config.mjs' : 'no story file found for this piece')

  // Convert first: if a story fails to render, the page in Paper is left as it was.
  const converted = []
  for (const id of chosen.stories) converted.push({ id, title: index[id]?.name ?? storyTitle(id), ...await convertStory(page, id, { base, tokenTable, open: piece.config.open, staged: piece.config.staged }) })

  // A story wider than the artboard's content is not scaled: the artboard grows to hold it.
  const widest = Math.max(...converted.flatMap((story) => story.parts.map((part) => part.size.width)))
  const width = Math.max(ARTBOARD.width, Math.ceil(widest) + ARTBOARD.padding * 2)
  const artboard = await ensureArtboard(file, { pageId, name: piece.name, styles: { ...artboardStyles(), width: `${width}px` }, knownId: previous?.artboardId })
  const placeholders = []
  let calls = (await writeTree(file, serialize, header(KINDS[piece.kind].eyebrow, piece.name, await summaryOf(piece)), artboard.id)).calls
  const stories = []
  const notes = []
  if (artboard.others.length) notes.push(`${artboard.others.length} other artboard${artboard.others.length === 1 ? '' : 's'} on this page not in the record (${artboard.others.map((name) => `"${name}"`).join(', ')}): left alone`)
  if (width > ARTBOARD.width) notes.push(`artboard is ${width}px wide: a story is wider than the usual 1280px content width`)
  if (chosen.trimmed) notes.push(`${chosen.trimmed} more stories pass the rule than the page shows (cap ${chosen.stories.length})`)
  if (chosen.missing.length) notes.push(`config names stories that do not exist: ${chosen.missing.join(', ')}`)
  for (const story of converted) {
    const shell = await writeTree(file, serialize, section(story.title), artboard.id)
    calls += shell.calls
    // a unique layer name per part: a designer can find it, and an export of it gets a file name of its own
    const named = story.parts.map((part) => ({ ...part, layer: pieceLayerName(piece, story.id, part.part === 'main' ? null : part.part) }))
    // a story that is one bare picture or icon gets a frame around it, so the layer still carries the story's name
    const roots = named.map((part) => (part.root.raw ? frame(part.layer, {}, [part.root]) : { ...part.root, name: part.layer }))
    let nodeIds
    if (roots.length === 1) {
      const written = await writeTree(file, serialize, roots[0], shell.id, { split: true, placeholders })
      calls += written.calls
      nodeIds = [written.id]
    } else {
      // the piece and its open panel sit side by side: they are separate things on screen
      const row = await writeTree(file, serialize, frame('States', { 'flex-wrap': 'wrap', 'align-items': 'flex-start', gap: 'var(--spacing-8)' }, roots), shell.id, { split: true, splitChildren: true, placeholders })
      calls += row.calls
      nodeIds = row.childIds
    }
    if (nodeIds.some((id) => !id)) throw new Error(`${story.id}: Paper drew nothing for it (the story is empty or fully transparent)`)
    const parts = named.map((part, position) => ({ part: part.part, nodeId: nodeIds[position], size: [part.size.width, part.size.height], htmlHash: digest(part.html) }))
    if (story.opened === 'closed') notes.push(`${story.id}: could not be opened; drawn closed (trigger only)`)
    if (story.opened === 'crashed') notes.push(`${story.id}: opening it crashes the story (${publicText(story.crash, { limit: 140 })}); drawn closed (trigger only)`)
    stories.push({ id: story.id, title: story.title, opened: story.opened, nodes: story.stats.nodes, approximated: story.stats.approximated, bound: story.stats.bound, bindable: story.stats.bindable, parts })
  }
  if (placeholders.length) { await file.call('delete_nodes', { nodeIds: placeholders }); calls++ }
  await file.call('finish_working_on_nodes', { nodeIds: [artboard.id] })

  const bindable = total(stories, 'bindable')
  return {
    record: {
      slug: piece.slug,
      name: piece.name,
      kind: piece.kind,
      status: 'synced',
      page: pageName(piece),
      pageId,
      artboardId: artboard.id,
      sources: piece.sources,
      sourceHash: sourceHash(piece),
      syncedAt: today(),
      counts: { stories: stories.length, nodes: total(stories, 'nodes'), approximated: total(stories, 'approximated'), bound: total(stories, 'bound'), bindable, bindingRate: bindable ? Math.round((total(stories, 'bound') / bindable) * 1000) / 1000 : 1 },
      notes,
      // the same loss on forty buttons is one fact, with a count
      lost: Object.entries(converted.flatMap((story) => story.stats.lost).reduce((counts, line) => { const key = line.replace(/\s*\(.*\)/, ''); counts[key] = (counts[key] ?? 0) + 1; return counts }, {})).map(([line, count]) => (count > 1 ? `${line} ×${count}` : line)).sort(),
      stories,
    },
    calls,
    created: artboard.created,
  }
}

export async function sync({ all = false, only = [], dryRun = false, prune = false, createFile = false, summary = null, base = process.env.PAPER_STORYBOOK_URL, log = console.log } = {}) {
  const started = Date.now()
  const report = (result) => { if (summary) writeFileSync(summary, JSON.stringify({ ok: true, at: new Date().toISOString(), queue: result.queue, failed: result.failed, removed: result.removed ?? [], dryRun: Boolean(result.dryRun), counts: result.counts ?? null }, null, 1) + '\n'); return result }
  const pieces = inventory()
  const unknown = only.filter((slug) => !pieces.some((piece) => piece.slug === slug))
  if (unknown.length) throw new Error(`no such piece: ${unknown.join(', ')} (names are file names: registry/blocks/<name>.tsx, src/components/ui/<name>.tsx)`)
  let state = readState()
  const queue = piecesToSync(pieces, statusOf(state, pieces), { all, only })
  const tokensMoved = state.tokens?.sourceHash !== tokensHash()
  const foundationsMoved = tokensMoved || state.foundations?.htmlHash !== foundationsHash()
  if (dryRun) {
    log(`would sync: ${tokensMoved || all ? 'tokens · ' : ''}${foundationsMoved || all ? 'Foundations · ' : ''}${queue.length} piece${queue.length === 1 ? '' : 's'}${queue.length ? `: ${queue.map((piece) => piece.slug).join(', ')}` : ''}`)
    return report({ queue: queue.map((piece) => piece.slug), failed: [], dryRun: true })
  }

  // Paper first: without it there is nothing to do, and Storybook takes a while to start.
  const paper = await connect()
  const file = await openQuillFile(paper, { create: createFile, state })
  state = { ...state, file: { id: file.fileId, name: file.name, url: file.url } }

  const tokens = await syncTokens(file, { prune, log })
  state = { ...state, tokens: tokens.record }
  if (!tokens.clean) log('  tokens are not in step: pieces drawn now may bind to missing tokens')

  // A piece whose code is gone: its drawing goes too (only the artboard the record names, and only if Paper
  // still calls it what the script called it). Its page is freed below, as `(unused N)`.
  const removed = []
  const gone = (candidate) => { const piece = pieces.find((known) => known.slug === candidate.slug); return !piece || (piece.config.declined && candidate.artboardId) }
  for (const entry of state.pieces.filter(gone)) {
    const outcome = entry.artboardId ? await removeArtboard(file, { artboardId: entry.artboardId, name: entry.name }) : { result: 'gone' }
    removed.push({ slug: entry.slug, page: entry.page ?? null, artboard: outcome.result, ...(outcome.why ? { why: outcome.why } : {}), at: today() })
    log(`removed: ${entry.slug} (${pieces.some((piece) => piece.slug === entry.slug) ? 'now declined' : 'its code is gone'}) · artboard ${outcome.result}${outcome.why ? `: ${outcome.why}` : ''}`)
  }
  // pages queued for removal by an offline reconcile (paper:status --record-pending) are handled the same way
  for (const entry of (state.removed ?? []).filter((candidate) => candidate.artboard === 'pending')) {
    const outcome = entry.artboardId ? await removeArtboard(file, { artboardId: entry.artboardId, name: entry.name }) : { result: 'gone' }
    Object.assign(entry, { artboard: outcome.result, ...(outcome.why ? { why: outcome.why } : {}) })
    delete entry.artboardId
    delete entry.name
    log(`removed earlier from the record: ${entry.slug} · artboard ${outcome.result}${outcome.why ? `: ${outcome.why}` : ''}`)
  }
  state = { ...state, pieces: state.pieces.filter((entry) => !gone(entry)), removed: [...(state.removed ?? []), ...removed].slice(-50) }

  // Every piece's page, not just the ones being written: the order is fixed by position.
  const wanted = [FOUNDATIONS, ...pieces.filter((piece) => !piece.config.declined).map(pageName)]
  const owners = Object.fromEntries([[FOUNDATIONS, state.foundations?.artboardId ? [state.foundations.artboardId] : []], ...state.pieces.filter((entry) => entry.artboardId).map((entry) => [entry.page, [entry.artboardId]])])
  // Which pages are the script's: the ids it recorded. A record from before ids were kept owns the pages it
  // names; a file this run has just created is the script's whole.
  const owned = state.ownedPages?.length ? state.ownedPages : file.created ? (await file.data('get_basic_info')).pages.map((page) => page.id) : [...new Set([...Object.values(state.pages ?? {}), state.foundations?.pageId].filter(Boolean))]
  const arranged = await arrangePages(file, wanted, owners, owned, log)
  if (!arranged.inOrder) log(`WARNING: Paper lists the script's pages out of order after arranging them. Read back: ${arranged.order.slice(0, 8).join(', ')}…`)
  if (arranged.foreign.length) log(`note: ${arranged.foreign.length} page${arranged.foreign.length === 1 ? '' : 's'} in this file ${arranged.foreign.length === 1 ? 'is' : 'are'} not Quill's: ${arranged.foreign.map((name) => `"${name}"`).join(', ')}; left alone (a page cannot be moved, so it stays where it sits among the generated ones)`)
  if (arranged.unused.length) log(`note: ${arranged.unused.length} generated page${arranged.unused.length === 1 ? ' is' : 's are'} no longer needed, now named "(unused N)" and emptied of ${arranged.unused.length === 1 ? 'its' : 'their'} piece. Paper cannot delete a page by script: delete by hand in Paper if you like; otherwise the sync reuses ${arranged.unused.length === 1 ? 'it' : 'them'} for the next new piece`)
  // a page that moved slots has a new id: correct the record before anything reads it
  state = { ...state, pages: arranged.pages, ownedPages: arranged.owned, pieces: state.pieces.map((entry) => (entry.page && arranged.pages[entry.page] ? { ...entry, pageId: arranged.pages[entry.page] } : entry)) }
  for (const piece of pieces) state = upsertPiece(state, stubRecord(piece, state.pieces.find((entry) => entry.slug === piece.slug && !piece.config.declined && entry.status !== 'declined')))

  if (foundationsMoved || all || tokens.changed || !state.foundations) {
    state = { ...state, foundations: await syncFoundations(file, arranged.pages[FOUNDATIONS], { knownId: state.foundations?.artboardId, log }) }
  }
  writeState(state)

  const failed = []
  if (queue.length) {
    const storybook = await ensureStorybook({ base, log })
    const tokenTable = quillTokenTable()
    const { browser, page } = await launch()
    try {
      for (const piece of queue) {
        const began = Date.now()
        const previous = state.pieces.find((entry) => entry.slug === piece.slug)
        try {
          const { record, calls, created } = await syncPiece({ file, page, piece, pageId: arranged.pages[pageName(piece)], previous, index: storybook.index, base: storybook.base, tokenTable })
          state = upsertPiece(state, record)
          log(`${record.page.padEnd(26)} ${String(record.counts.stories).padStart(2)} stories · ${String(record.counts.nodes).padStart(4)} nodes · ${String(record.counts.approximated).padStart(2)} approximated · ${String(Math.round(record.counts.bindingRate * 100)).padStart(3)}% bound · ${calls} writes · ${Math.round((Date.now() - began) / 100) / 10}s${created ? ' · new artboard' : ''}${record.notes.length ? ` · ${record.notes.length} note${record.notes.length === 1 ? '' : 's'}` : ''}`)
        } catch (error) {
          // Paper going away is the end of the run, not one piece's problem: stop, and let the next run resume
          if (error instanceof PaperError && error.code === 'not-open') throw new PaperError(`Paper stopped answering while writing ${piece.slug}: reopen it and run paper:sync again (it resumes with what is left)`, { code: 'not-open' })
          failed.push(piece.slug)
          state = upsertPiece(state, { ...(previous ?? {}), slug: piece.slug, name: piece.name, kind: piece.kind, status: 'error', error: publicText(error.message), page: pageName(piece), pageId: arranged.pages[pageName(piece)] })
          log(`${pageName(piece).padEnd(26)} ERROR ${publicText(error.message, { limit: 200 })}`)
        }
        writeState(state)
      }
    } finally {
      await browser.close()
      await storybook.stop()
      // never leave Paper's "an agent is working here" marker on, even after a failure
      await file.call('finish_working_on_nodes').catch(() => {})
    }
  }
  writeState(state)
  const counts = state.pieces.reduce((tally, entry) => ({ ...tally, [entry.status]: (tally[entry.status] ?? 0) + 1 }), {})
  log(`\npaper:sync · ${queue.length} piece${queue.length === 1 ? '' : 's'} written · ${failed.length} failed · ${Math.round((Date.now() - started) / 1000)}s · file now: ${Object.entries(counts).map(([status, count]) => `${count} ${status}`).join(' · ')}`)
  if (failed.length) log(`failed: ${unique(failed).join(', ')} (the message is in paper/sync-state.json; fix and run paper:sync again)`)
  return report({ queue: queue.map((piece) => piece.slug), failed, removed: removed.map((entry) => entry.slug), counts, state })
}

export function parseArgs(args) {
  const value = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined)
  return { summary: value('--summary') ?? null, force: args.includes('--force'), all: args.includes('--all'), only: (value('--only') ?? '').split(',').map((name) => name.trim()).filter(Boolean), dryRun: args.includes('--dry-run'), prune: args.includes('--prune'), createFile: args.includes('--create-file'), accept: args.includes('--accept'), base: value('--base') ?? process.env.PAPER_STORYBOOK_URL }
}

if (isMain(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2))
    delete options.accept
    delete options.force
    const result = await sync(options)
    process.exit(result.failed.length ? 1 : 0)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
