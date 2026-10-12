import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { renderCss } from './build-tokens.mjs'
import { tokens } from '../src/tokens/quill.tokens.mjs'

// Quill carried a second vocabulary beside the colour contract (`--surface-card`
// is `--card`, `--text-strong` is `--foreground`). No shipped component and no
// utility ever used it, yet DESIGN.md told agents to "reach for these" — along
// with three names that never existed. Retired in 0.10.0 (kept emitting so an app
// that wrote `var(--text-strong)` kept its colour), removed from the CSS in 0.13.0
// once the one live app was confirmed off them. The list survives in the source so
// `@quill/check` can still name each one.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const names = Object.keys(tokens.retired)
const re = new RegExp(`--(${names.join('|')})(?![a-z0-9-])`, 'g')

test('the retired names no longer ship — not as a variable, not as a utility', () => {
  const { root: css, theme } = renderCss(tokens)
  assert.equal(names.length, 11) // the ten duplicate aliases, and `danger` (it is `destructive`)
  for (const n of names) assert.doesNotMatch(css, new RegExp(`--${n}:`), `--${n} should not be emitted any more`)
  // The utility spellings that read `--indigo` under an older name went with them.
  for (const n of ['indigo-brand', 'indigo-brand-deep']) assert.doesNotMatch(theme, new RegExp(`--color-${n}:`), `--color-${n} should not be emitted any more`)
  // Anti-vacuity: the current names are still there.
  assert.match(css, /--ink:\s/)
  assert.match(theme, /--color-indigo:\s*var\(--indigo\)/)
})

test('no code in this repo uses a retired name', () => {
  const DIRS = ['registry/blocks', 'registry/lib', 'registry/examples', 'src/components', 'src/app', 'src/stories', 'src/usage']
  const hits = []
  let files = 0
  for (const dir of DIRS) {
    for (const f of readdirSync(join(root, dir), { recursive: true })) {
      if (!/\.(tsx|ts|mdx|mjs)$/.test(f)) continue
      files++
      for (const m of readFileSync(join(root, dir, f), 'utf8').matchAll(re)) hits.push(`${join(dir, f)}: ${m[0]}`)
    }
  }
  assert.ok(files > 150, `expected 150+ files, read ${files}`)
  assert.deepEqual([...new Set(hits)], [])
})

test('no agent-facing document names a retired or never-existing token', () => {
  const never = ['--text-muted', '--text-accent', '--accent-pressed'] // DESIGN.md listed these; none ever shipped
  for (const doc of ['DESIGN.md', 'PRODUCT.md', 'AGENTS.md', 'README.md', 'public/llms.txt', 'registry/agent-rules/quill.md']) {
    const text = readFileSync(join(root, doc), 'utf8')
    assert.deepEqual([...new Set([...text.matchAll(re)].map((m) => m[0]))], [], `${doc} still teaches a retired name`)
    for (const n of never) assert.equal(new RegExp(n.replace(/-/g, '\\-') + '(?![a-z0-9-])').test(text), false, `${doc} names ${n}, which never existed`)
  }
})
