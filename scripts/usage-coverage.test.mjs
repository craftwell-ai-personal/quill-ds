import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { ALL_USAGE } from '../src/usage/index.mjs'
import { EXAMPLES } from '../src/usage/examples.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const storiesDir = join(root, 'src/stories')

// Story files whose usage name(s) can't be derived from the filename by the
// default kebab-case rule, because the filename diverges from the block's
// registry slug (e.g. SettingsForm.stories.tsx documents 'settings', not
// 'settings-form'). Both directions of the mapping are spelled out here. One
// story file documents exactly one block: the Storybook MCP manifest keys its
// entries on the meta's `component`, so a two-block file had none (CRA-212).
const MULTI_BLOCK_STORIES = {
  'patterns/SettingsForm.stories.tsx': ['settings'],
  'patterns/DashboardShell.stories.tsx': ['dashboard'],
  'patterns/Error404.stories.tsx': ['error-404'],
}
const USAGE_NAME_TO_MULTI_BLOCK_STORY = Object.fromEntries(
  Object.entries(MULTI_BLOCK_STORIES).flatMap(([file, names]) => names.map((n) => [n, file])),
)

export function storyFileFor(name) {
  if (USAGE_NAME_TO_MULTI_BLOCK_STORY[name]) return join(storiesDir, USAGE_NAME_TO_MULTI_BLOCK_STORY[name])
  const pascal = name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('')
  const candidates = [
    join(storiesDir, `${name}.stories.tsx`),
    join(storiesDir, `${pascal}.stories.tsx`),
    join(storiesDir, 'patterns', `${pascal}.stories.tsx`),
    // composition examples keep their stories under examples/, named without the prefix
    join(storiesDir, 'examples', `${pascal.replace(/^Example/, '')}.stories.tsx`),
  ]
  return candidates.find(existsSync)
}

test('every usage file has a story file', () => {
  for (const u of ALL_USAGE) {
    assert.ok(storyFileFor(u.name), `usage '${u.name}' has no story file under src/stories`)
  }
})

test('every visual rule has a rendered DoDont pair in its story file', () => {
  for (const u of ALL_USAGE) {
    const file = storyFileFor(u.name)
    if (!file) continue
    const source = readFileSync(file, 'utf8')
    for (const r of u.rules.filter((r) => r.visual)) {
      assert.ok(
        source.includes(`id="${r.id}"`),
        `story for '${u.name}' renders no DoDont pair for visual rule '${r.id}'`,
      )
    }
  }
})

// Wave-1 allowlist: stories that predate the usage system. Waves 2-3 shrink
// this list to empty. Entries may ONLY be removed, never added — a new
// component must ship with a usage file.
const KNOWN_UNDOCUMENTED = new Set([])

test('every story outside the allowlist has a usage file', () => {
  const files = [
    ...readdirSync(storiesDir).filter((f) => f.endsWith('.stories.tsx')),
    ...readdirSync(join(storiesDir, 'patterns')).filter((f) => f.endsWith('.stories.tsx')).map((f) => `patterns/${f}`),
  ]
  const documented = new Set(ALL_USAGE.map((u) => u.name))
  for (const f of files) {
    if (KNOWN_UNDOCUMENTED.has(f)) continue
    if (MULTI_BLOCK_STORIES[f]) {
      for (const name of MULTI_BLOCK_STORIES[f]) {
        assert.ok(documented.has(name), `story '${f}' has no usage file for '${name}' (expected src/usage/${name}.usage.mjs)`)
      }
      continue
    }
    const base = f.replace(/^patterns\//, '').replace(/\.stories\.tsx$/, '')
    const kebab = base.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    assert.ok(documented.has(kebab), `story '${f}' has no usage file (expected src/usage/${kebab}.usage.mjs)`)
  }
})

// Composition examples (src/stories/examples) are registry examples, not
// components: their install docs and composition order come from
// src/usage/examples.mjs, and their usage guide from a usage module like any
// other piece. The stories and examples.mjs are mirrored both ways.
const pascalOf = (name) => name.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join('')
test('composition example stories and src/usage/examples.mjs mirror each other', () => {
  const files = readdirSync(join(storiesDir, 'examples')).filter((f) => f.endsWith('.stories.tsx'))
  for (const f of files) {
    const kebab = f.replace(/\.stories\.tsx$/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    assert.ok(EXAMPLES.some((e) => e.name === `example-${kebab}`), `story 'examples/${f}' has no entry in src/usage/examples.mjs`)
  }
  for (const e of EXAMPLES) {
    const file = `${pascalOf(e.name.replace(/^example-/, ''))}.stories.tsx`
    assert.ok(files.includes(file), `example '${e.name}' has no story src/stories/examples/${file}`)
  }
})
