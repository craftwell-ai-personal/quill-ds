/**
 * `npm run paper:status`: where every piece stands, from files alone. No Paper, no
 * Storybook, no network: it compares paper/sync-state.json with the code on disk.
 *
 *   in step    drawn in Paper from the code as it is now
 *   stale      drawn, but its code has changed since     → npm run paper:sync
 *   pending    never drawn                               → npm run paper:sync
 *   error      the last sync failed for it               → read the message, fix, sync again
 *   declined   has no page, with the reason
 *
 *   npm run paper:status -- --record-pending   # bring the record in line with the code (no Paper needed)
 *
 * Always exits 0: a stale piece is a to-do for whoever has Paper open, not a failure.
 */
import { tokensHash } from '../lib/source-hash.mjs'
import { readState, today, writeState } from './file.mjs'
import { inventory, pageName, statusOf, storyFiles } from './pieces.mjs'
import { isMain } from '../lib/is-main.mjs'

export function status(state = readState(), pieces = inventory()) {
  const rows = statusOf(state, pieces)
  const by = (name) => rows.filter((row) => row.status === name)
  const tokens = !state.tokens ? 'pending' : state.tokens.sourceHash === tokensHash() ? 'in step' : 'stale'
  return { rows, tokens, counts: Object.fromEntries(['in step', 'stale', 'pending', 'error', 'declined'].map((name) => [name, by(name).length])) }
}

export function renderStatus({ rows, tokens, counts }) {
  const lines = [`Paper file: ${rows.length} pieces · ${Object.entries(counts).map(([name, count]) => `${count} ${name}`).join(' · ')} · tokens ${tokens}`]
  const list = (name, describe) => { const found = rows.filter((row) => row.status === name); if (found.length) lines.push('', `${name} (${found.length})`, ...found.map((row) => `  ${row.page.padEnd(28)} ${describe(row)}`)) }
  list('stale', (row) => `code changed since ${row.syncedAt}`)
  list('pending', () => 'not drawn yet')
  list('error', (row) => row.reason ?? '')
  list('declined', (row) => row.reason)
  const todo = counts.stale + counts.pending + counts.error + (tokens === 'in step' ? 0 : 1)
  lines.push('', todo ? 'To bring Paper in step: open Paper, then  npm run paper:sync' : 'Everything drawn in Paper matches the code.')
  return lines.join('\n')
}

/**
 * `-- --record-pending`: bring the record in line with the code WITHOUT Paper, for a machine that cannot draw
 * (a laptop without the app, a pull request that renames a story). Nothing here touches the Paper file; what
 * it queues is carried out by the next `paper:sync`.
 *   a new piece                      → a `pending` entry (or `declined`, if the config says so)
 *   a recorded story that is gone    → dropped; the piece becomes `pending` (its page and artboard are kept,
 *                                      so the next sync redraws in place)
 *   a piece whose code is gone       → dropped; its artboard is queued for removal
 *   declined in config, not in record (or the reverse) → the record follows the config
 */
export function reconcile(state = readState(), pieces = inventory(), storyIds = new Set(storyFiles().flatMap((file) => file.ids)), date = today()) {
  const changes = []
  const queued = []
  const kept = []
  for (const entry of state.pieces) {
    const piece = pieces.find((candidate) => candidate.slug === entry.slug)
    if (!piece || (piece.config.declined && entry.status !== 'declined')) {
      if (entry.artboardId) queued.push({ slug: entry.slug, page: entry.page ?? null, artboard: 'pending', artboardId: entry.artboardId, name: entry.name, at: date })
      changes.push(piece ? `${entry.slug}: now declined in the config` : `${entry.slug}: its code is gone; removed from the record${entry.artboardId ? ', its artboard queued for removal' : ''}`)
      if (piece) kept.push({ slug: piece.slug, name: piece.name, kind: piece.kind, status: 'declined', reason: piece.config.declined })
      continue
    }
    if (entry.status === 'declined' && !piece.config.declined) {
      changes.push(`${entry.slug}: no longer declined; waiting to be drawn`)
      kept.push({ slug: piece.slug, name: piece.name, kind: piece.kind, status: 'pending', page: pageName(piece) })
      continue
    }
    const vanished = (entry.stories ?? []).filter((story) => !storyIds.has(story.id))
    if (vanished.length) {
      changes.push(`${entry.slug}: ${vanished.length} recorded stor${vanished.length === 1 ? 'y no longer exists' : 'ies no longer exist'} (${vanished.map((story) => story.id.split('--')[1]).join(', ')}); waiting to be redrawn`)
      kept.push({ ...entry, status: 'pending', stories: entry.stories.filter((story) => storyIds.has(story.id)) })
      continue
    }
    kept.push(entry)
  }
  const known = new Set(kept.map((entry) => entry.slug))
  for (const piece of pieces.filter((candidate) => !known.has(candidate.slug))) {
    kept.push(piece.config.declined ? { slug: piece.slug, name: piece.name, kind: piece.kind, status: 'declined', reason: piece.config.declined } : { slug: piece.slug, name: piece.name, kind: piece.kind, status: 'pending', page: pageName(piece) })
    changes.push(`${piece.slug}: new; ${piece.config.declined ? 'declined' : 'waiting to be drawn'}`)
  }
  return { state: { ...state, pieces: kept, removed: [...(state.removed ?? []), ...queued].slice(-50) }, changes }
}

if (isMain(import.meta.url)) {
  if (process.argv.includes('--record-pending')) {
    const result = reconcile()
    writeState(result.state)
    console.log(result.changes.length ? `record brought in line with the code (no Paper needed):\n${result.changes.map((line) => `  ${line}`).join('\n')}\n` : 'the record already matches the code\n')
  }
  console.log(renderStatus(status()))
}
