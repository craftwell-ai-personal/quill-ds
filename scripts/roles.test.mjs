import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderCss } from './build-tokens.mjs'
import { tokens } from '../src/tokens/quill.tokens.mjs'
import { ROLE_INTENTS, STATUS_INTENTS, TINT_INTENTS, renderRolesSection } from '../src/usage/roles.mjs'

// The agent docs named 3 to 12 of the 31 colour roles and said when to use none.
// src/usage/roles.mjs now carries one line per role; these tests keep it complete
// (a role cannot ship without a line) and true (a line cannot name what does not ship).
const { theme, root: rootCss } = renderCss(tokens)
const colourClasses = new Set([...theme.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]))
const variables = new Set([...rootCss.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]))

test('every role that ships has an intent line, and nothing else does', () => {
  assert.deepEqual(Object.keys(ROLE_INTENTS), Object.keys(tokens.semantic))
  assert.deepEqual(Object.keys(STATUS_INTENTS), Object.keys(tokens.status))
  const tints = tokens.tints.map((t) => `tint/${t.of}/${t.pct}`)
  assert.equal(tints.length, 20)
  assert.deepEqual(Object.keys(TINT_INTENTS), tints)
})

test('a line is short enough to install into every app, and says both halves', () => {
  for (const [group, table] of Object.entries({ ROLE_INTENTS, STATUS_INTENTS, TINT_INTENTS })) {
    for (const [k, r] of Object.entries(table)) {
      for (const half of ['use', 'never']) {
        assert.ok(r[half] && r[half].length >= 12, `${group}.${k}.${half} is empty`)
        assert.ok(r[half].length <= 170, `${group}.${k}.${half} is ${r[half].length} chars — agents read this on every task; keep it under 170`)
      }
      if (r.pairs) assert.ok(r.pairs in tokens.semantic, `${k} pairs with '${r.pairs}', which is not a role`)
    }
  }
})

test('a status role is documented as a class exactly when its class ships', () => {
  for (const [k, r] of Object.entries(STATUS_INTENTS)) {
    assert.equal(r.form === 'class', colourClasses.has(k), `--${k}: documented as ${r.form}, class ${colourClasses.has(k) ? 'ships' : 'does not ship'}`)
    if (r.form === 'class') assert.ok(r.use.includes(`\`text-${k}\``), `${k}: name the class (\`text-${k}\`) so an agent can type it`)
  }
})

test('nothing an intent line names in backticks is missing from the shipped theme', () => {
  const FAMILY = /^(paper|ink|moss|terracotta|indigo|gold|teal|line|surface|background|foreground|card|popover|primary|secondary|muted|accent|destructive|border|input|ring|chart|sidebar|link|success|warning|danger|info|working|queued)(-|$)/
  const missing = []
  const lines = [ROLE_INTENTS, STATUS_INTENTS, TINT_INTENTS].flatMap((t) => Object.values(t)).flatMap((r) => [r.use, r.never, r.code ?? ''])
  for (const line of lines) {
    for (const [, word] of line.matchAll(/`([^`]+)`/g)) {
      const cls = word.match(/(?:^|\s)(?:[a-z-]+:)*(?:bg|text|border|ring|fill|stroke)-([a-z0-9-]+)(?:\/\d+)?(?=\s|$)/)
      if (cls) { if (FAMILY.test(cls[1]) && !colourClasses.has(cls[1])) missing.push(`${word} — no --color-${cls[1]}`); continue }
      const v = word.match(/^(--[a-z][a-z0-9-]*)$/)
      if (v && !variables.has(v[1])) missing.push(`${word} — not a shipped variable`)
      if (/^[a-z]+(-[a-z0-9]+)*$/.test(word) && FAMILY.test(word) && !(word in tokens.semantic) && !(word in tokens.status)) missing.push(`${word} — not a role`)
    }
  }
  assert.deepEqual([...new Set(missing)], [])
})

test('the rendered section carries every role, status role and tint', () => {
  const out = renderRolesSection()
  for (const k of Object.keys(tokens.semantic)) assert.ok(out.includes(`- \`${k}\` (`), `${k} missing from the rendered section`)
  for (const k of Object.keys(tokens.status)) assert.ok(out.includes(`- \`--${k}\` (`), `--${k} missing`)
  for (const r of Object.values(TINT_INTENTS)) assert.ok(out.includes(r.code), `${r.code} missing`)
  assert.ok(!/shadcn\//.test(out))
})
