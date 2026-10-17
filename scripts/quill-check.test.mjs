import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { renderCheck, checkData, CHECK_PATH } from './build-check.mjs'

test('registry/check/quill-check.mjs is in sync with its sources (run `npm run build:check`)', () => {
  assert.ok(existsSync(CHECK_PATH), 'generated file missing — run npm run build:check')
  assert.equal(readFileSync(CHECK_PATH, 'utf8'), renderCheck(), 'the check script is stale — run `npm run build:check`')
})

test('the inlined data carries every table the rules read', () => {
  const d = checkData()
  assert.equal(typeof d.version, 'string')
  assert.ok(d.quillClasses.includes('font-heading') && d.quillClasses.includes('text-2xs') && d.quillClasses.includes('bg-background'))
  assert.equal(d.vars['--accent-pigment-text'], 'accent-pigment-text')
  assert.equal(d.tokens.text.sm, 13.6)
  assert.equal(d.retired.classes['indigo-brand'].use, 'indigo')
  assert.equal(d.retired.classes['indigo-brand'].removed, '0.13.0')
  assert.equal(Object.keys(d.retired.vars).length, 11)
  assert.equal(d.retired.vars['--text-strong'].removed, '0.13.0')
  assert.ok(d.roles.card.length > 20 && d.roles.card.length <= 110)
  assert.deepEqual(d.palette.bg.white, ['background', 'card'])
  assert.match(d.swatches.background, /^#[0-9A-F]{6}$/)
  assert.deepEqual(d.tokens.motion.ease, ['--ease-out', '--ease-soft'])
  assert.equal(d.tokens.motion.duration['--dur-fast'], 200)
})

// ---------------------------------------------------------------- the checker itself
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const check = await import(CHECK_PATH)

const byRule = (findings) => findings.reduce((m, f) => ((m[f.rule] ??= []).push(f), m), {})

test('rules 2–5 flag one of each violation in the fixture (static mode) and nothing else', async () => {
  const { findings, layout } = await check.runCheck({ cwd: here, dirs: [join(here, 'check/fixture')], tailwind: false })
  const r = byRule(findings.filter((f) => !f.allowed))
  assert.deepEqual((r.palette ?? []).map((f) => f.value).sort(), ['bg-white', 'font-serif', 'md:hover:bg-red-600', 'text-black', 'text-gray-500'])
  assert.deepEqual((r.bracket ?? []).map((f) => f.value).sort(), ['bg-[#F5EDDD]', 'h-[24px]', 'max-w-[880px]', 'rounded-[10px]', 'text-[13px]', 'text-[var(--accent-pigment-text)]', 'tracking-[0.15em]', 'w-[420px]'])
  assert.deepEqual((r.retired ?? []).map((f) => f.value).sort(), ['text-indigo-brand', 'var(--text-strong)'])
  assert.deepEqual((r['raw-color'] ?? []).map((f) => f.value).sort(), ['rgb(245, 237, 221)'])
  assert.deepEqual((r['allow-without-reason'] ?? []).map((f) => f.value), ['palette'])
  assert.deepEqual(Object.keys(r).sort(), ['allow-without-reason', 'bracket', 'palette', 'raw-color', 'retired'])
  assert.equal(layout, 0)
  const allowed = findings.filter((f) => f.allowed)
  assert.equal(allowed.length, 1)
  assert.equal(allowed[0].value, '#4285F4')
  assert.equal(allowed[0].allowed, 'Google brand mark')
  assert.ok(!findings.some((f) => f.value.includes('#pricing') || f.value === 'text-foreground'), 'anchors and roles are not colours')
})

test('fix text names the token or role an agent should write', async () => {
  const { findings } = await check.runCheck({ cwd: here, dirs: [join(here, 'check/fixture')], tailwind: false })
  const fix = (v) => findings.find((f) => f.value === v)?.fix ?? ''
  assert.match(fix('text-[13px]'), /text-sm/)
  assert.match(fix('tracking-[0.15em]'), /tracking-eyebrow/)
  assert.match(fix('rounded-[10px]'), /rounded-lg/)
  assert.match(fix('text-[var(--accent-pigment-text)]'), /text-accent-pigment-text/)
  assert.match(fix('bg-white'), /bg-background.*bg-card|bg-card.*bg-background/)
  assert.match(fix('text-indigo-brand'), /text-indigo\b.*0\.9\.60.*0\.13\.0/)
  assert.match(fix('var(--text-strong)'), /0\.10\.0.*0\.13\.0.*var\(--ink\)/)
  assert.match(fix('font-serif'), /font-heading/)
  assert.match(fix('bg-[#F5EDDD]'), /bg-background|bg-paper/)
})

// ---------------------------------------------------------------- rules 6 and 7: Quill's size scales
const scaleRun = () => check.runCheck({ cwd: here, dirs: [join(here, 'check/fixture-scale')], tailwind: false })
const valuesOf = (findings, rule, file) => findings.filter((f) => f.rule === rule && !f.allowed && (!file || f.file.endsWith(file))).map((f) => f.value).sort()

test('rule 6: a Tailwind step or a bracket length outside Quill\'s scales is a finding, widths and heights included', async () => {
  const { findings, layout } = await scaleRun()
  assert.deepEqual(valuesOf(findings, 'scale', 'scale.tsx'), ['-mt-13', 'border-5', 'max-w-md', 'max-w-prose', 'p-13', 'p-3.25', 'p-frame', 'rounded', 'text-6xl', 'w-64', 'w-frame'])
  assert.deepEqual(valuesOf(findings, 'bracket', 'scale.tsx'), ['border-[3px]', 'gap-[22px]', 'h-[24px]', 'mt-[-3px]', 'p-[13px]', 'p-[var(--space-4)]', 'w-[317px]'])
  assert.equal(layout, 2, 'w-[calc(100%-2rem)] and h-[1lh] are not lengths a token could replace: counted')
  // the first line is all on-scale, and prose that looks like a class is not one
  assert.ok(!findings.some((f) => f.file.endsWith('scale.tsx') && f.line === 5), 'nothing on the on-scale line')
  assert.ok(!findings.some((f) => f.file.endsWith('scale.tsx') && f.line === 8 && f.value !== 'rounded'), 'only the bare rounded among classes on the prose line')
  assert.equal(findings.filter((f) => f.value === 'rounded').length, 1, 'the bare word in the aria-label is prose')
  const allowed = findings.filter((f) => f.allowed && f.file.endsWith('scale.tsx'))
  assert.deepEqual(allowed.map((f) => f.value), ['p-11'])
})

test('rule 6: the fix is the nearest Quill step, with its size', async () => {
  const { findings } = await scaleRun()
  const fix = (v) => findings.find((f) => f.value === v)?.fix ?? ''
  assert.match(fix('p-13'), /p-12 \(48px\) or p-16 \(64px\)/)
  assert.match(fix('p-3.25'), /p-3 \(12px\) or p-3\.5 \(14px\)/)
  assert.match(fix('-mt-13'), /-mt-12 \(48px\) or -mt-16 \(64px\)/)
  assert.match(fix('mt-[-3px]'), /-mt-0\.5 \(2px\) or -mt-1 \(4px\)/)
  assert.match(fix('gap-[22px]'), /gap-5 \(20px\) or gap-6 \(24px\)/)
  assert.match(fix('h-[24px]'), /h-6 \(the same 24px\)/)
  assert.match(fix('p-[var(--space-4)]'), /p-4 \(the same step\)/)
  assert.match(fix('border-[3px]'), /border-3 \(the same 3px\)/)
  assert.match(fix('border-5'), /border-4 \(4px\), Quill's largest step/)
  assert.match(fix('text-6xl'), /text-4xl \(64px\), the nearest Quill size; text-6xl is Tailwind's own \(60px\)/)
  assert.match(fix('rounded'), /rounded-sm \(4px\)/)
  // widths and heights: the spacing steps, then the size steps named for their job
  assert.match(fix('w-64'), /w-rail \(240px\) or w-panel \(288px\)/)
  assert.match(fix('max-w-md'), /max-w-card-lg \(the same 448px\); max-w-md is Tailwind's own width scale \(448px\)/)
  assert.match(fix('w-[317px]'), /w-panel \(288px\) or w-card-sm \(320px\)/)
  assert.match(fix('max-w-prose'), /max-w-measure \(672px\)/)
  // a height step is a height: not padding, not a width
  assert.match(fix('p-frame'), /p-24 \(96px\): frame is a height \(560px, a whole-screen block/)
  assert.match(fix('w-frame'), /w-card-xl \(the same 560px\): frame is a height step/)
})

test('rule 7: numbers typed into an inline style get the Quill variable', async () => {
  const { findings } = await scaleRun()
  assert.deepEqual(valuesOf(findings, 'inline-style'), ["border: '3px solid var(--border)'", 'borderRadius: 7', "fontSize: '14px'", "margin: '8px 12px'", 'padding: 13', 'width: 317'])
  const fix = (v) => findings.find((f) => f.value === v)?.fix ?? ''
  assert.match(fix('padding: 13'), /13px → var\(--space-3\) \(12px, the nearest step\)/)
  assert.match(fix("margin: '8px 12px'"), /8px → var\(--space-2\), 12px → var\(--space-3\)$/)
  assert.match(fix('borderRadius: 7'), /var\(--radius-md\)/)
  assert.match(fix("border: '3px solid var(--border)'"), /3px → var\(--border-width-3\)$/)
  assert.match(fix('width: 317'), /317px → var\(--size-card-sm\) \(320px, the nearest step\)/)
})

test('rule 7: an app stylesheet is read the same way; the theme file, variables and @theme are not', async () => {
  const { findings } = await scaleRun()
  assert.deepEqual(valuesOf(findings, 'css-value', 'app.css'), ['border-radius: 7px', 'border: 2px solid var(--border)', 'font-size: 0.85rem', 'padding: 13px', 'padding: 2rem', 'width: 317px'])
  assert.deepEqual(valuesOf(findings, 'scale', 'app.css'), ['p-13'], '@apply goes through the class rules')
  const fix = (v) => findings.find((f) => f.value === v)?.fix ?? ''
  assert.match(fix('font-size: 0.85rem'), /0\.85rem → var\(--text-sm\)$/)
  assert.match(fix('padding: 2rem'), /2rem → var\(--space-8\)$/)
  assert.ok(!findings.some((f) => f.file.endsWith('quill-theme.css')), 'the theme file holds the raw values on purpose')
  assert.ok(!findings.some((f) => /--brand-gap|--spacing-huge/.test(f.value)), 'variable definitions are tokens, not uses')
  // an allow above a selector covers that rule's block
  assert.deepEqual(findings.filter((f) => f.allowed && f.file.endsWith('app.css')).map((f) => [f.value, f.allowed]), [['inset: 7px', "the embed's iframe needs this exact inset"]])
  assert.equal(findings.find((f) => f.value === 'padding: 13px').line, 2)
})

// ---------------------------------------------------------------- rule 1: the app's own Tailwind
test('rule 1: a class that produces no CSS is unresolved, with a typo hint; Quill classes resolve', async () => {
  const { findings, notes } = await check.runCheck({ cwd: repoRoot, dirs: [join(here, 'check/fixture')], css: join(repoRoot, 'src/app/globals.css') })
  const un = findings.filter((f) => f.rule === 'unresolved').map((f) => f.value)
  assert.deepEqual(un, ['bg-nope'])
  assert.match(findings.find((f) => f.value === 'bg-nope').fix, /typo|no such utility/)
  assert.ok(!findings.some((f) => f.value === 'text-2xs'), 'text-2xs resolves on the site entry')
  assert.deepEqual(notes, [])
})

test('rule 1: when Quill classes fail together the fix says the theme is not wired', async () => {
  const { writeFileSync, mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const dir = mkdtempSync(join(tmpdir(), 'quill-check-'))
  writeFileSync(join(dir, 'globals.css'), '@import "tailwindcss";\n')
  writeFileSync(join(dir, 'page.tsx'), 'export const P = () => <div className="font-heading text-2xs bg-background text-muted-foreground">x</div>\n')
  const { findings } = await check.runCheck({ cwd: repoRoot, dirs: [dir], css: join(dir, 'globals.css') })
  const un = findings.filter((f) => f.rule === 'unresolved')
  assert.equal(un.length, 4)
  assert.match(un[0].fix, /not wired into Tailwind/)
})

test('rule 1 is skipped, not guessed, when Tailwind cannot be loaded', async () => {
  const { findings, notes } = await check.runCheck({ cwd: here, dirs: [join(here, 'check/fixture')], css: '/nonexistent.css' })
  assert.ok(!findings.some((f) => f.rule === 'unresolved'))
  assert.equal(notes.length, 1)
  assert.match(notes[0], /rule 1 skipped/)
})

// ---------------------------------------------------------------- CLI
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const runCli = (args) => {
  try { return { out: execFileSync(process.execPath, [CHECK_PATH, ...args], { cwd: repoRoot, encoding: 'utf8' }), code: 0 } } catch (e) { return { out: e.stdout, code: e.status } }
}

test('CLI: text output groups by file with a fix per line, summary counts allows and layout, exit 1 on findings', () => {
  const { out, code } = runCli(['--dir', join(here, 'check/fixture'), '--css', join(repoRoot, 'src/app/globals.css')])
  assert.equal(code, 1)
  assert.match(out, /^scripts\/check\/fixture\/fixture\.tsx$/m)
  assert.match(out, /^\s+\d+\s+bg-white\s+palette\s+→/m)
  assert.match(out, /\d+ findings · 1 allowed · 0 layout sizes not checked/)
})

test('CLI: --json is machine-readable and exit 0 when every finding is allowed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'quill-check-'))
  writeFileSync(join(dir, 'ok.tsx'), '{/* quill-check: allow raw-color — brand mark */}\nexport const A = () => <i style={{ color: "#4285F4" }} className="bg-card" />\n')
  const { out, code } = runCli(['--dir', dir, '--css', join(repoRoot, 'src/app/globals.css'), '--json'])
  assert.equal(code, 0)
  const j = JSON.parse(out)
  assert.equal(j.summary.findings, 0)
  assert.equal(j.summary.allowed, 1)
  assert.equal(j.findings[0].allowed, 'brand mark')
})

test('CLI: --json arrives whole when the report is larger than a pipe buffer', () => {
  // main() used to end with process.exit(code): on macOS, stdout to a pipe is asynchronous, so
  // a report past ~64 KB lost its tail and an agent parsing it got "Unterminated string".
  // Seen on tech-careers (2,197 findings). process.exitCode lets the pipe drain first.
  const dir = mkdtempSync(join(tmpdir(), 'quill-check-'))
  const lines = Array.from({ length: 1500 }, (_, i) => `<i style={{ color: "#${((i * 7919) % 0xffffff).toString(16).padStart(6, '0')}" }} />`)
  writeFileSync(join(dir, 'big.tsx'), `export const B = () => <>${lines.join('\n')}</>\n`)
  const { out, code } = runCli(['--dir', dir, '--css', join(repoRoot, 'src/app/globals.css'), '--json'])
  assert.equal(code, 1)
  assert.ok(out.length > 65536, `the report should exceed the 64 KB pipe buffer, got ${out.length}`)
  const j = JSON.parse(out) // throws on a truncated report
  assert.equal(j.summary.findings, 1500)
})

// ---------------------------------------------------------------- dogfood
test("the check runs clean on Quill's own shipped blocks, lib and examples", async () => {
  const dirs = ['registry/blocks', 'registry/lib', 'registry/examples'].map((d) => join(repoRoot, d))
  const { findings, notes } = await check.runCheck({ cwd: repoRoot, dirs, css: join(repoRoot, 'src/app/globals.css') })
  const active = findings.filter(check.isActive)
  assert.deepEqual(active.map((f) => `${f.file}:${f.line} ${f.value} [${f.rule}]`), [], "Quill's own code must satisfy the rules it enforces on apps")
  assert.deepEqual(notes, [])
})

test('rule dark-variant: a stock @custom-variant dark line below the import overrides Quill\'s, and the check says so', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'quill-check-'))
  writeFileSync(join(dir, 'globals.css'), `@import "tailwindcss";\n@import "${join(repoRoot, 'registry/themes/quill.css')}";\n@custom-variant dark (&:is(.dark *));\n`)
  writeFileSync(join(dir, 'page.tsx'), 'export const P = () => <div className="bg-background dark:bg-card">x</div>\n')
  const { findings } = await check.runCheck({ cwd: repoRoot, dirs: [dir], css: join(dir, 'globals.css') })
  const dv = findings.filter((f) => f.rule === 'dark-variant')
  assert.equal(dv.length, 1)
  assert.equal(dv[0].line, 3)
  assert.match(dv[0].fix, /the last line of this file/)
  // and the fixed order is clean
  writeFileSync(join(dir, 'globals.css'), `@import "tailwindcss";\n@custom-variant dark (&:is(.dark *));\n@import "${join(repoRoot, 'registry/themes/quill.css')}";\n`)
  const ok = await check.runCheck({ cwd: repoRoot, dirs: [dir], css: join(dir, 'globals.css') })
  assert.equal(ok.findings.filter((f) => f.rule === 'dark-variant').length, 0)
})

test('rule dark-variant: a theme imported from the layout, not the stylesheet, gets told to add the import — not to move one', async () => {
  // tech-careers 2026-09-23: the stylesheet held shadcn's @theme (so bg-background resolved) and
  // the stock dark line, and quill-theme.css was imported from layout.tsx. The fix text said the
  // stock line "sits below Quill's" — there was no Quill import to sit above.
  const dir = mkdtempSync(join(tmpdir(), 'quill-check-'))
  writeFileSync(join(dir, 'globals.css'), '@import "tailwindcss";\n@custom-variant dark (&:is(.dark *));\n@theme inline {\n  --color-background: var(--background);\n  --color-card: var(--card);\n}\n')
  writeFileSync(join(dir, 'page.tsx'), 'export const P = () => <div className="bg-background dark:bg-card">x</div>\n')
  const { findings } = await check.runCheck({ cwd: repoRoot, dirs: [dir], css: join(dir, 'globals.css') })
  const dv = findings.filter((f) => f.rule === 'dark-variant')
  assert.equal(dv.length, 1)
  assert.equal(dv[0].line, 2)
  assert.match(dv[0].fix, /not imported from this stylesheet/)
  assert.match(dv[0].fix, /as the last line of this file/)
  assert.doesNotMatch(dv[0].fix, /sits below Quill's/)
  assert.equal(findings.filter((f) => f.rule === 'radius-override').length, 0, 'no Quill theme here: the radii are not Quill\'s to defend')
})

// ---------------------------------------------------------------- rule radius-override
// What `shadcn init` writes (CLI 4.22, measured 2026-10-16), with Quill's theme FILE imported where
// the docs used to say — below the dark line, which is above shadcn's radius block.
const THEME = join(repoRoot, 'registry/themes/quill.css')
const STOCK_RADIUS = '@theme inline {\n  --radius-sm: calc(var(--radius) * 0.6);\n  --radius-md: calc(var(--radius) * 0.8);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) * 1.4);\n  --radius-2xl: calc(var(--radius) * 1.8);\n  --radius-3xl: calc(var(--radius) * 2.2);\n  --radius-4xl: calc(var(--radius) * 2.6);\n}\n\n:root {\n  --radius: 0.625rem;\n}\n'
const radiusRun = async (css) => {
  const dir = mkdtempSync(join(tmpdir(), 'quill-check-'))
  writeFileSync(join(dir, 'globals.css'), css)
  writeFileSync(join(dir, 'page.tsx'), 'export const P = () => <div className="bg-background rounded-xl">x</div>\n')
  const { findings } = await check.runCheck({ cwd: repoRoot, dirs: [dir], css: join(dir, 'globals.css') })
  return findings.filter((f) => f.rule === 'radius-override')
}

test('rule radius-override: shadcn\'s radius lines below the theme import override Quill\'s, and each one is named', async () => {
  const found = await radiusRun(`@import "tailwindcss";\n@custom-variant dark (&:is(.dark *));\n@import "${THEME}";\n\n${STOCK_RADIUS}`)
  assert.deepEqual(found.map((f) => f.value).sort(), ['--radius-2xl: calc(var(--radius) * 1.8)', '--radius-3xl: calc(var(--radius) * 2.2)', '--radius-4xl: calc(var(--radius) * 2.6)', '--radius-lg: var(--radius)', '--radius-md: calc(var(--radius) * 0.8)', '--radius-sm: calc(var(--radius) * 0.6)', '--radius-xl: calc(var(--radius) * 1.4)', '--radius: 0.625rem'])
  const fix = (v) => found.find((f) => f.value.startsWith(v))?.fix ?? ''
  assert.match(fix('--radius-xl'), /rounded-xl renders 14px, Quill's is 16px/)
  assert.match(fix('--radius-sm'), /rounded-sm renders 6px, Quill's is 4px/)
  assert.match(fix('--radius-lg'), /rounded-lg renders 10px, Quill's is 8px/)
  assert.match(fix('--radius:'), /shadcn's --radius \(10px\), not Quill's \(8px\)/)
  assert.match(fix('--radius-xl'), /the last line of this file/)
  assert.equal(found.find((f) => f.value.startsWith('--radius-xl')).line, 9)
})

test('rule radius-override: with the theme imported as the last line, Quill\'s radii win and nothing is flagged', async () => {
  assert.deepEqual(await radiusRun(`@import "tailwindcss";\n@custom-variant dark (&:is(.dark *));\n\n${STOCK_RADIUS}\n@import "${THEME}";\n`), [])
})

test('rule radius-override: a lone stock line still counts, and says when it only matches by coincidence', async () => {
  // tech-careers on 2026-10-16: shadcn's lines below the import, and no --radius of its own, so --radius is Quill's 8px
  const found = await radiusRun(`@import "tailwindcss";\n@import "${THEME}";\n@theme inline {\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) * 1.4);\n}\n`)
  assert.deepEqual(found.map((f) => f.value), ['--radius-lg: var(--radius)', '--radius-xl: calc(var(--radius) * 1.4)'])
  assert.match(found[0].fix, /the same as Quill's 8px today, only because --radius is 8px/)
  assert.match(found[1].fix, /rounded-xl renders 11\.2px, Quill's is 16px/)
})

test('rule radius-override: the CLI install, which replaces shadcn\'s radius lines, is clean', async () => {
  const { transformCssVars } = await import('@shadcn/registry/internal/utils/updaters/update-css-vars')
  const { transformCss } = await import('@shadcn/registry/internal/utils/updaters/update-css')
  const item = JSON.parse(readFileSync(join(repoRoot, 'public/r/quill.json'), 'utf8'))
  const stock = `@import "tailwindcss";\n\n@custom-variant dark (&:is(.dark *));\n\n${STOCK_RADIUS}`
  const merged = await transformCss(await transformCssVars(stock, item.cssVars, { tailwind: { cssVariables: true } }, { tailwindVersion: 'v4', overwriteCssVars: true }), item.css)
  assert.deepEqual(await radiusRun(merged), [])
})

test('radiusPx reads shadcn\'s shapes', () => {
  assert.equal(check.radiusPx('calc(var(--radius) * 1.4)', 10), 14)
  assert.equal(check.radiusPx('calc(var(--radius) - 4px)', 10), 6)
  assert.equal(check.radiusPx('var(--radius)', 8), 8)
  assert.equal(check.radiusPx('0.375rem', 8), 6)
  assert.equal(check.radiusPx('var(--radius-md)', 8), null)
})

test('CLI: run through a symlinked folder or a folder with a space, it still checks and fails', async () => {
  // The script used to compare import.meta.url (the real path) with argv[1] as written. Through a
  // symlink (macOS temp folders are one) or a space (`%20`), they differed, main() never ran, and
  // the check printed nothing and exited 0: a false pass.
  const { symlinkSync, copyFileSync, mkdirSync, realpathSync } = await import('node:fs')
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'quill-check-')))
  const real = join(base, 'app with space')
  mkdirSync(real)
  copyFileSync(CHECK_PATH, join(real, 'quill-check.mjs'))
  writeFileSync(join(real, 'page.tsx'), 'export const P = () => <div className="bg-blue-500" />\n')
  symlinkSync(real, join(base, 'linked'))
  for (const script of [join(base, 'linked', 'quill-check.mjs'), join(real, 'quill-check.mjs')]) {
    let out = ''
    let code = 0
    try { out = execFileSync(process.execPath, [script, '--dir', real], { cwd: real, encoding: 'utf8' }) } catch (e) { out = e.stdout; code = e.status }
    assert.equal(code, 1, `${script} should report the finding and exit 1`)
    assert.match(out, /bg-blue-500/)
  }
})
