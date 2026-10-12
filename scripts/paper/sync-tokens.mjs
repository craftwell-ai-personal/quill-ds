/**
 * Push Quill's tokens into the Paper file as Paper tokens (one step of `npm run paper:sync`).
 *
 * Safe to run again and again: it creates what is missing, updates what changed and names
 * what Paper has that Quill does not. It only deletes with `prune`.
 * The mapping (names, values, types, what cannot be represented) lives in ./tokens.mjs.
 */
import { tokensHash } from '../lib/source-hash.mjs'
import { today } from './file.mjs'
import { payloadHash, planTokenSync, quillPaperTokens, resolveValue } from './tokens.mjs'

const BATCH = 60 // tokens per call: one answer line per token, kept small enough to read when one fails

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, index) => list.slice(index * size, (index + 1) * size))
const wire = ({ name, type, value }) => ({ name, type, value })

async function send(file, tool, entries) {
  const failures = []
  for (const batch of chunks(entries, BATCH)) {
    const answer = await file.data(tool, { tokens: batch })
    answer.tokens.forEach((result, index) => { if (result.result === 'error') failures.push(`${batch[index].name}: ${result.message}`) })
  }
  return failures
}

/** Returns `{ record, clean, changed, plan, failures }`; `record` goes under `tokens` in the sync state. */
export async function syncTokens(file, { prune = false, dryRun = false, log = console.log } = {}) {
  const { tokens, skipped } = quillPaperTokens()
  const existing = (await file.data('get_tokens')).tokens
  const plan = planTokenSync(tokens, existing)
  const changed = plan.create.length + plan.update.length > 0 || (prune && plan.extra.length + plan.retype.length > 0)
  log(`tokens: ${tokens.length} · ${plan.create.length} to create · ${plan.update.length} to update · ${plan.retype.length} with the wrong type · ${plan.unchanged.length} unchanged · ${plan.extra.length} extra in Paper`)
  if (plan.extra.length) log(`  extra (not Quill's${prune ? ', deleting' : '; --prune deletes them'}): ${plan.extra.join(', ')}`)
  if (plan.retype.length && !prune) log(`  wrong type (a token cannot change type in place; --prune recreates them): ${plan.retype.map((token) => token.name).join(', ')}`)
  const byType = {}
  for (const token of tokens) byType[token.type] = (byType[token.type] ?? 0) + 1
  const record = { count: tokens.length, byType, payloadHash: payloadHash(tokens), sourceHash: tokensHash(), theme: 'light', notRepresentable: skipped.length, syncedAt: today() }
  if (dryRun || !changed) return { record, plan, skipped, changed, clean: !changed, failures: [] }

  const failures = []
  if (prune) {
    const doomed = [...plan.extra, ...plan.retype.map((token) => token.name)]
    if (doomed.length) failures.push(...await send(file, 'set_tokens', doomed.map((name) => ({ name, delete: true }))))
    plan.create.push(...plan.retype)
  }
  if (plan.create.length) {
    // Paper rejects `var(--x)` until --x exists, and lists tokens in creation order. So an
    // alias is born holding its end value (keeping its place in the list) and is pointed at
    // its target once every token is there.
    const literals = new Map(tokens.map((token) => [token.name, String(token.value)]))
    const isAlias = (token) => String(token.value).startsWith('var(')
    failures.push(...await send(file, 'create_tokens', plan.create.map((token) => wire(isAlias(token) ? { ...token, value: resolveValue(token.name, literals) } : token))))
    plan.update.push(...plan.create.filter(isAlias))
  }
  if (plan.update.length) failures.push(...await send(file, 'set_tokens', plan.update.map(({ name, value }) => ({ name, value }))))
  for (const failure of failures) log(`  FAILED ${failure}`)

  // Read back rather than trust the write: the record must describe what Paper holds.
  const after = (await file.data('get_tokens')).tokens
  const verify = planTokenSync(tokens, after)
  const clean = !failures.length && !verify.create.length && !verify.update.length
  log(`  ${clean ? 'in step' : 'NOT in step'}: Paper holds ${after.length} tokens; ${verify.unchanged.length}/${tokens.length} match after the push`)
  return { record, plan, skipped, changed, clean, failures }
}
