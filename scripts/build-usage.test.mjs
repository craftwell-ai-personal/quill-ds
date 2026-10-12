import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { ALL_USAGE } from '../src/usage/index.mjs'
import { EXAMPLES } from '../src/usage/examples.mjs'
import { renderUsagePage, renderUsageJson, renderUsageIndex, renderModulesDts, usageDocsField, renderCode, codeNames, usageHash, USAGE_DIR, CODE_DIR, REGISTRY_PATH, MODULES_DTS_PATH } from './build-usage.mjs'
import { renderThemeDocs, accentNames, LLMS_URL } from '../src/usage/theme-docs.mjs'
import { ALL_MODES, DEFAULT_MODE, DEFAULT_ACCENT } from '../src/tokens/themes.mjs'

test('src/usage/modules.d.ts is generated and current (run `npm run build:usage`)', () => {
  assert.equal(readFileSync(MODULES_DTS_PATH, 'utf8'), renderModulesDts(), 'src/usage/modules.d.ts is stale — run `npm run build:usage`')
})

test('every usage entry has a committed, current public usage page (run `npm run build:usage`)', () => {
  for (const u of ALL_USAGE) {
    const path = join(USAGE_DIR, `${u.name}.md`)
    assert.ok(existsSync(path), `public/usage/${u.name}.md is missing — run \`npm run build:usage\``)
    assert.equal(readFileSync(path, 'utf8'), renderUsagePage(u), `public/usage/${u.name}.md is stale — run \`npm run build:usage\``)
  }
})

test('every usage entry is also published as data, with an index (run `npm run build:usage`)', () => {
  for (const u of ALL_USAGE) {
    const path = join(USAGE_DIR, `${u.name}.json`)
    assert.ok(existsSync(path), `public/usage/${u.name}.json is missing — run \`npm run build:usage\``)
    assert.equal(readFileSync(path, 'utf8'), renderUsageJson(u), `public/usage/${u.name}.json is stale — run \`npm run build:usage\``)
  }
  const index = join(USAGE_DIR, 'index.json')
  assert.ok(existsSync(index), 'public/usage/index.json is missing — run `npm run build:usage`')
  assert.equal(readFileSync(index, 'utf8'), renderUsageIndex(), 'public/usage/index.json is stale — run `npm run build:usage`')
  assert.ok(!ALL_USAGE.some((u) => u.name === 'index'), 'a usage entry named "index" would overwrite public/usage/index.json')
})

test('every stock primitive with a guide publishes its source, and only those (run `npm run build:usage`)', () => {
  const names = codeNames()
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  const shipped = new Set(registry.items.map((item) => item.name))
  assert.ok(names.length > 0)
  for (const name of names) assert.ok(!shipped.has(name), `${name} is a registry item: its source is already at /r/${name}.json`)
  for (const name of ['button', 'sidebar', 'breadcrumb']) assert.ok(names.includes(name), `${name} should publish its source`)
  assert.deepEqual(readdirSync(CODE_DIR).sort(), names.map((n) => `${n}.json`).sort(), 'public/code has missing or stray files — run `npm run build:usage`')
  for (const name of names) {
    assert.equal(readFileSync(join(CODE_DIR, `${name}.json`), 'utf8'), renderCode(name), `public/code/${name}.json is stale — run \`npm run build:usage\``)
    const code = JSON.parse(renderCode(name))
    assert.equal(code.name, name)
    assert.equal(code.files[0].content, readFileSync(join(import.meta.dirname, '..', 'src/components/ui', `${name}.tsx`), 'utf8'))
  }
})

test('the usage index fingerprints each guide and marks which ones have source', () => {
  const index = JSON.parse(renderUsageIndex())
  const withCode = new Set(codeNames())
  for (const entry of index.guides) {
    const u = ALL_USAGE.find((g) => g.name === entry.name)
    assert.equal(entry.hash, usageHash(u))
    assert.match(entry.hash, /^[0-9a-f]{64}$/)
    assert.equal(entry.code === true, withCode.has(entry.name), `${entry.name}: code flag`)
    if (!withCode.has(entry.name)) assert.ok(!('code' in entry))
  }
  assert.equal(new Set(index.guides.map((g) => g.hash)).size, index.guides.length, 'two guides share a hash')
})

test('pieces that do the same job name each other in their alternatives', () => {
  const pairs = [['empty', 'empty-state'], ['command', 'command-palette']]
  for (const [a, b] of pairs) {
    const of = (name) => ALL_USAGE.find((u) => u.name === name).alternatives.map((alt) => alt.name)
    assert.ok(of(a).includes(b), `${a} should name ${b}`)
    assert.ok(of(b).includes(a), `${b} should name ${a}`)
  }
})

test('registry.json carries the derived docs field, description, and use_when for documented items', () => {
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  const byName = new Map(registry.items.map((i) => [i.name, i]))
  for (const u of ALL_USAGE) {
    const item = byName.get(u.name)
    if (!item) continue // primitives like button/dialog are not registry items
    // example pages keep install docs and description from src/usage/examples.mjs (composition order first);
    // registry-meta.test.mjs checks those
    if (EXAMPLES.some((e) => e.name === u.name)) continue
    assert.equal(item.docs, usageDocsField(u), `registry item '${u.name}' docs is stale — run \`npm run build:usage\``)
    assert.equal(item.description, u.summary, `registry item '${u.name}' description diverges from its usage file summary`)
    if (item.type === 'registry:block') {
      assert.equal(item.meta?.use_when, u.useWhen[0], `registry item '${u.name}' use_when diverges from its usage file`)
    }
  }
})

test('the base `quill` item ships install-time docs naming every theme and the default accent', () => {
  // This is the one item every consuming app installs, and the only moment the
  // CLI prints guidance. It shipped with no `docs` at all for months, which is
  // why apps were never told that `--yes` silently skips a changed file.
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))
  const base = registry.items.find((i) => i.name === 'quill')
  assert.ok(base, 'base theme item "quill" not found in registry')
  assert.equal(base.docs, renderThemeDocs(), 'base item docs is stale — run `npm run build:usage`')

  const docs = renderThemeDocs()
  for (const m of ALL_MODES) {
    assert.match(docs, new RegExp(m.label), `install docs never name the ${m.label} theme`)
    if (m.attr !== DEFAULT_MODE.attr) {
      assert.ok(docs.includes(`data-theme="${m.attr}"`), `install docs never give the data-theme value for ${m.label}`)
    }
  }
  for (const a of accentNames()) {
    assert.match(docs, new RegExp(a), `install docs never name the ${a} accent`)
  }
  assert.match(docs, new RegExp(`${DEFAULT_ACCENT} \\(default\\)`), 'install docs must mark the default accent')
  // The two rules an app cannot discover on its own, and fails silently without.
  assert.match(docs, /--overwrite/, 'install docs must state the update rule (--yes silently skips)')
  assert.match(docs, /never raw pigments/, 'install docs must state the chart-token rule')
  assert.ok(docs.includes(LLMS_URL), 'install docs must point agents at llms.txt')
})

test('no published usage page carries an HTML entity where an agent should read a tag', () => {
  // 26 of 106 pages printed literal `&lt;` for weeks because the Storybook
  // escaper was reused for the markdown pages.
  for (const u of ALL_USAGE) {
    const page = readFileSync(join(USAGE_DIR, `${u.name}.md`), 'utf8')
    assert.ok(!page.includes('&lt;'), `public/usage/${u.name}.md contains &lt; — the markdown format must wrap tags in backticks instead`)
  }
})
