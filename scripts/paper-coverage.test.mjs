import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { orderState, readState, STATE_PATH } from './paper/file.mjs'
import { inventory, KINDS, pageName, storyFiles } from './paper/pieces.mjs'

// Does every component, block and template have a declared place in the Paper file?
//
// Asked over the source folders
// (src/components/ui, registry/lib, registry/blocks, registry/examples). Paper can only
// be written from a Mac with the app open, so a piece is allowed to be `pending`: what is
// not allowed is a piece nobody has accounted for. Being out of date is NOT a failure here
// (a dependency bot cannot re-draw Paper): `npm run paper:status` reports it and
// `npm run paper:sync` repairs it, locally. Nothing in this file needs Paper or Storybook.

const state = readState()
const pieces = inventory()
const entries = new Map(state.pieces.map((entry) => [entry.slug, entry]))
const STATUSES = ['synced', 'pending', 'declined', 'error']
// the same way out of every failure a code change can cause: it needs no Paper, so any pull request can run it
const FIX = 'Run  npm run paper:status -- --record-pending  (no Paper needed) and commit paper/sync-state.json. Later, on the Mac with Paper open,  npm run paper:sync  draws what is waiting.'

test('every component, block and template has an entry in paper/sync-state.json', () => {
  const missing = pieces.filter((piece) => !entries.has(piece.slug))
  assert.deepEqual(missing.map((piece) => piece.slug), [], `no Paper status for: ${missing.map((piece) => `${piece.kind} ${piece.slug}`).join(', ')}.\n${FIX}\n`
    + 'A piece with nothing to draw is declined instead: add  \'<name>\': { declined: \'<reason>\' }  to scripts/paper/pieces.config.mjs, then run the same command.')
})

test('the record holds no piece whose code is gone', () => {
  const known = new Set(pieces.map((piece) => piece.slug))
  const orphans = state.pieces.filter((entry) => !known.has(entry.slug)).map((entry) => entry.slug)
  assert.deepEqual(orphans, [], `paper/sync-state.json lists pieces with no file behind them: ${orphans.join(', ')}.\n${FIX}`)
})

test('every entry has a known status; a declined piece says why, a failed one says what failed', () => {
  for (const entry of state.pieces) {
    assert.ok(STATUSES.includes(entry.status), `${entry.slug}: status must be one of ${STATUSES.join(', ')} (got ${entry.status})`)
    if (entry.status === 'declined') assert.ok(entry.reason?.trim(), `${entry.slug}: a declined piece needs a reason`)
    if (entry.status === 'error') assert.ok(entry.error?.trim(), `${entry.slug}: an errored piece records its message`)
  }
})

test('declined in the config and declined in the record agree', () => {
  for (const piece of pieces) {
    const entry = entries.get(piece.slug)
    if (!entry) continue
    assert.equal(entry.status === 'declined', Boolean(piece.config.declined), `${piece.slug}: scripts/paper/pieces.config.mjs and paper/sync-state.json disagree on whether it is declined.\n${FIX}`)
  }
})

test('a synced entry names its page, artboard, stories and the code it was drawn from', () => {
  for (const entry of state.pieces.filter((candidate) => candidate.status === 'synced')) {
    assert.match(entry.pageId ?? '', /^p-[0-9A-Z]+-\d+$/, `${entry.slug}: page id`)
    assert.match(entry.artboardId ?? '', /^[0-9A-Z]+-\d+$/, `${entry.slug}: artboard id`)
    assert.match(entry.sourceHash ?? '', /^[0-9a-f]{16}$/, `${entry.slug}: source hash`)
    assert.ok(entry.stories?.length >= 1, `${entry.slug}: at least one story`)
    for (const story of entry.stories) {
      assert.ok(story.parts?.length >= 1 && story.parts.every((part) => part.nodeId && /^[0-9a-f]{16}$/.test(part.htmlHash)), `${entry.slug} / ${story.id}: each drawn part has a layer id and an HTML hash`)
    }
    assert.ok(entry.counts?.nodes > 0, `${entry.slug}: node count`)
  }
})

test('page names follow the convention and no two pieces share a page', () => {
  const marks = Object.fromEntries(Object.entries(KINDS).map(([kind, { mark }]) => [kind, mark]))
  const paged = state.pieces.filter((entry) => entry.status !== 'declined')
  for (const entry of paged) {
    assert.ok(entry.page?.startsWith(`${marks[entry.kind]} `), `${entry.slug}: a ${entry.kind} page is named "${marks[entry.kind]} <Title Case>" (got ${entry.page})`)
    const piece = pieces.find((candidate) => candidate.slug === entry.slug)
    if (piece) assert.equal(entry.page, pageName(piece), `${entry.slug}: page name`)
  }
  const names = paged.map((entry) => entry.page)
  assert.equal(new Set(names).size, names.length, `duplicate page name: ${names.filter((name, index) => names.indexOf(name) !== index).join(', ')}`)
  const ids = paged.map((entry) => entry.pageId).filter(Boolean)
  assert.equal(new Set(ids).size, ids.length, 'two pieces claim the same Paper page id')
})

test('every recorded story still exists in the story files', () => {
  // parsed from src/stories, never run: this test must not need Storybook
  const known = new Set(storyFiles().flatMap((file) => file.ids))
  const gone = state.pieces.flatMap((entry) => (entry.stories ?? []).filter((story) => !known.has(story.id)).map((story) => `${entry.slug}: ${story.id}`))
  assert.deepEqual(gone, [], `the record names stories that no longer exist (renamed or deleted): ${gone.join(', ')}.\n${FIX}`)
})

test('the record is written in its fixed order, so a diff shows only what changed', () => {
  assert.equal(readFileSync(STATE_PATH, 'utf8'), JSON.stringify(orderState(state), null, 2) + '\n', 'paper/sync-state.json was edited by hand or by an older script: re-save it with  npm run paper:status -- --record-pending')
})
