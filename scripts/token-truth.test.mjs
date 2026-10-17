import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { ALL_USAGE } from '../src/usage/index.mjs'
import { renderFoundations, renderPrinciples } from '../src/usage/foundations.mjs'
import { quillTokens } from './consumer-reachability.test.mjs'

// Token truth (spec W17). Agents copy token names literally, and an undefined
// custom property renders nothing, silently. So every `--name` written in any
// agent-facing text — the usage modules, the generated foundations and
// principles, llms.txt — must be a custom property the built `quill` item
// actually delivers (public/r/quill.json: the theme file plus cssVars and css).
// Before this test the usage modules named seven Tailwind-default radius and
// shadow tokens Quill never shipped, and DESIGN.md a whole leading/tracking
// scale that did not exist.

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const shipped = quillTokens(JSON.parse(readFileSync(join(root, 'public/r/quill.json'), 'utf8')))

// A whole token name: `--` plus a lowercase/digit/hyphen run that ends in a
// letter or digit and is not followed by more of the same. `--dk-*` (a prefix
// family, glob follows) and `--chart-N` (a placeholder, capital follows) yield
// no match at all instead of a truncated one, which is what the earlier
// lookahead version got wrong (it matched `--char`); camel-cased CLI flags
// such as `--noEmit` yield nothing for the same reason.
export function tokenNames(text) {
  // `_` too: a half-step is `--space-2_5` (a dot is illegal in the name)
  return [...new Set([...text.matchAll(/--[a-z][a-z0-9_-]*[a-z0-9](?![A-Za-z0-9_-])/g)].map((m) => m[0]))]
}

// CLI flags read like tokens; they are not.
const NOT_TOKENS = new Set(['--overwrite', '--yes', '--no-src-dir', '--src-dir', '--cwd', '--all', '--path'])

const sources = {
  'src/usage/*.usage.mjs': JSON.stringify(ALL_USAGE),
  'src/usage/foundations.mjs (foundations)': renderFoundations(),
  'src/usage/foundations.mjs (principles)': renderPrinciples({ blockCount: 51 }),
  'public/llms.txt': readFileSync(join(root, 'public/llms.txt'), 'utf8'),
  'registry/agent-rules/quill.md': readFileSync(join(root, 'registry/agent-rules/quill.md'), 'utf8'),
  // The hand-written documents too. DESIGN.md sat outside this guard and told agents
  // to "reach for" three variables that never existed, plus a focus ring and a scrim
  // defined in neither stylesheet.
  'DESIGN.md': readFileSync(join(root, 'DESIGN.md'), 'utf8'),
  'PRODUCT.md': readFileSync(join(root, 'PRODUCT.md'), 'utf8'),
}

test('the built theme item defines a meaningful number of custom properties', () => {
  assert.ok(shipped.size > 200, `only ${shipped.size} custom properties found in public/r/quill.json — is it built?`)
  for (const name of ['--paper', '--ink', '--ring', '--space-4', '--radius-xl', '--text-2xs', '--font-display']) {
    assert.ok(shipped.has(name), `${name} should ship`)
  }
})

for (const [label, text] of Object.entries(sources)) {
  test(`every --token named in ${label} ships in the theme item`, () => {
    const missing = tokenNames(text).filter((n) => !shipped.has(n) && !NOT_TOKENS.has(n))
    assert.deepEqual(missing, [], `${label} names custom properties consumers never receive: ${missing.join(', ')}`)
  })
}
