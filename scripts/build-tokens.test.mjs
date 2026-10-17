import { test } from 'node:test'
import assert from 'node:assert/strict'
import { transform } from 'lightningcss'
import { readFileSync } from 'node:fs'
import { renderCss, injectMarkers, cssVarName, registryBlock, registryPayload, renderManager, darkVariant, MODES, renderAiUtilities, AI_UTILITIES, AI_RULES, FORCED_COLORS_RULES, renderForcedColors } from './build-tokens.mjs'
import { tokens } from '../src/tokens/quill.tokens.mjs'
import { renderPrinciples } from '../src/usage/foundations.mjs'

test('generated CSS survives strict minification (LightningCSS) with light primitives intact', () => {
  // The production build + downstream consumers minify with LightningCSS, which THROWS on
  // invalid custom-property names (e.g. a dot in `--space-2.5`) and drops the whole :root
  // block — silently breaking light mode. This guards against any such name regressing.
  const { root, dark } = renderCss(tokens)
  const css = `:root{${root}}\n[data-theme="dark"]{${dark}}`
  const out = transform({ filename: 'quill.css', code: Buffer.from(css), minify: true }).code.toString()
  assert.match(out, /f5eddd/i, 'light --paper must survive minification')
  assert.match(out, /8a7f6e/i, 'light --line-control must survive minification')
  assert.equal(/--space-\d+\.\d+\s*:/.test(root), false, 'no dotted custom-property names')
})

test('cssVarName drops a trailing base leaf', () => {
  assert.equal(cssVarName(['paper', 'base']), '--paper')
  assert.equal(cssVarName(['paper', 'warm']), '--paper-warm')
  assert.equal(cssVarName(['pigment', 'terracotta', 'deep']), '--terracotta-deep')
})

test('renderCss reproduces primitive + dk + remap declarations', () => {
  const { theme, root, dark } = renderCss(tokens)
  assert.match(root, /--paper:\s*#F5EDDD;/)
  assert.match(root, /--dk-paper:\s*#20180E;/)
  assert.match(dark, /--paper:\s*var\(--dk-paper\);/)
  // semantic + shadcn present in :root
  assert.match(root, /--text-accent-color:\s*var\(--accent-pigment-text\);/)
  assert.match(root, /--accent-pigment-text:\s*var\(--moss-deep\);/)
  assert.match(root, /--destructive:\s*var\(--terracotta-deep\);/)
  // @theme mappings + scale
  assert.match(theme, /--color-terracotta:\s*var\(--terracotta\);/)
  // the size scales hold their values in :root; @theme points each utility at them
  assert.match(root, /--radius-lg:\s*0\.5rem;/)
  assert.match(root, /--text-xl:\s*1\.5rem;/)
  assert.match(theme, /--radius-lg:\s*var\(--radius-lg\);/)
  assert.match(theme, /--text-xl:\s*var\(--text-xl\);/)
})

test('registryBlock emits the dark variant, @theme inline, :root and all theme blocks', () => {
  const css = renderCss(tokens)
  const block = registryBlock(css)
  // Since 0.12.0 the file carries the utility layer too: honoured when imported from
  // inside the Tailwind stylesheet, inert (as before) when imported from a layout.
  assert.ok(block.startsWith('@custom-variant dark (&:is(.dark *, [data-theme="dark"] *'), 'the file opens with the dark variant, stock class kept')
  assert.match(block, /@theme inline \{\n  --font-sans:/)
  assert.match(block, /--color-paper: var\(--paper\);/)
  assert.match(block, /:root \{/)
  assert.match(block, /\[data-theme="dark"\] \{/)
  assert.match(block, /--terracotta-deep: #8A4530;/)
  // classic themes ship to consumers too, with the right color-scheme
  assert.match(block, /\[data-theme="classic-light"\] \{\n  color-scheme: light;/)
  assert.match(block, /\[data-theme="classic-dark"\] \{\n  color-scheme: dark;/)
})

test('renderCss emits prefixed vars + remaps for the classic modes', () => {
  const { root, modes } = renderCss(tokens)
  assert.match(root, /--cl-paper:\s*#FFFFFF;/)
  assert.match(root, /--cd-paper:\s*#000000;/)
  assert.match(root, /--cl-terracotta:\s*#DE501B;/)
  const byAttr = Object.fromEntries(modes.map((m) => [m.attr, m]))
  assert.match(byAttr['classic-light'].body, /--paper:\s*var\(--cl-paper\);/)
  assert.match(byAttr['classic-dark'].body, /--shadow-pop:\s*var\(--cd-shadow-pop\);/)
  assert.equal(byAttr['dark'].body, renderCss(tokens).dark)
})

test('accent blocks emit after theme blocks so the chosen accent wins on <html>', () => {
  const css = renderCss(tokens)
  const block = registryBlock(css)
  for (const name of ['terracotta', 'moss', 'indigo', 'gold']) {
    assert.match(block, new RegExp(`\\[data-accent="${name}"\\] \\{`))
  }
  assert.match(block, /\[data-accent="gold"\] \{\n  --accent-pigment: var\(--gold-deep\);\n  --accent-pigment-text: var\(--gold-text\);/)
  // theme blocks re-declare the DEFAULT accent (island safety); source order
  // must put accent blocks after theme blocks so [data-accent] still wins.
  assert.ok(block.lastIndexOf('[data-theme=') < block.indexOf('[data-accent='))
  // gold's AA text cut exists as a primitive in :root. Derived from the token
  // source, not a frozen literal: the *value* is owned by the 16-combo WCAG
  // check in quill.tokens.test.mjs, which asserts the real 4.5:1 contrast. A
  // hardcoded hex here only duplicates that check badly — it went stale through
  // two legitimate AA retunes (#826637 → #755C32 → #68522D) and turned CI red
  // for a passing design change.
  assert.match(css.root, new RegExp(`--gold-text:\\s*${tokens.color.pigment.gold.text.light};`))
})

test('theme blocks re-declare aliases so nested data-theme islands re-resolve', () => {
  // `--background: var(--paper)` resolves where declared — without these lines a
  // scoped `<div data-theme="dark">` would remap primitives but keep :root-resolved
  // alias values (light card colors on a dark island).
  const { modes } = renderCss(tokens)
  for (const m of modes) {
    assert.match(m.body, /--background:\s*var\(--paper\);/, `${m.attr} missing shadcn alias re-declare`)
    assert.match(m.body, /--success:\s*var\(--moss-deep\);/, `${m.attr} missing status alias re-declare`)
  }
})

test('injectMarkers replaces only between markers and is idempotent', () => {
  const src = 'A\n/* @quill-tokens:start */\nOLD\n/* @quill-tokens:end */\nB\n'
  const out1 = injectMarkers(src, 'NEW')
  assert.equal(out1, 'A\n/* @quill-tokens:start */\nNEW\n/* @quill-tokens:end */\nB\n')
  assert.equal(injectMarkers(out1, 'NEW'), out1)
})

test('manager theme resolves literals incl. readable input border', () => {
  const m = renderManager(tokens)
  assert.equal(m.inputBorder, '#8A7F6E')   // line-control light — same border as DS fields
  assert.equal(m.inputBg, '#EFE4CE')       // paper-warm light
  assert.equal(m.appBg, '#F5EDDD')         // paper light
  assert.equal(m.barSelectedColor, '#C4684B') // terracotta light
  assert.equal(m.textColor, '#2A2622')     // ink light
})

test('every role colour reads a variable the theme declares', () => {
  // A role that names a missing primitive compiles to an unset variable and paints nothing.
  const { root } = renderCss(tokens)
  for (const [k, v] of Object.entries({ ...tokens.semantic, ...tokens.status })) {
    const name = /^var\((--[a-z0-9-]+)\)$/.exec(v)?.[1]
    assert.ok(name, `${k}: '${v}' is not var(--x)`)
    assert.match(root, new RegExp(`${name}:`), `${k} reads ${name}, which :root never declares`)
  }
})

// Two guards for the same class of bug: a value added to the token source but
// not to a hand-kept list beside it. That is how `text-gold-text` compiled to
// nothing (no palette entry) and how 80 `dark:` utilities went dead on the
// intelligent theme (selector named two of three dark themes).
test('every pigment cut has a --color-* utility mapping', () => {
  const { theme } = renderCss(tokens)
  const mapped = new Set([...theme.matchAll(/--color-[a-z0-9-]+:\s*var\((--[a-z0-9-]+)\)/g)].map((m) => m[1]))
  const missing = []
  for (const [family, cuts] of Object.entries(tokens.color.pigment)) {
    for (const cut of Object.keys(cuts)) {
      const cssVar = cut === 'base' ? `--${family}` : `--${family}-${cut}`
      if (!mapped.has(cssVar)) missing.push(cssVar)
    }
  }
  assert.deepEqual(
    missing,
    [],
    `pigment cuts with no Tailwind utility — classes referencing them compile to nothing: ${missing.join(', ')}`,
  )
  // Anti-vacuity: fail if the regex stops matching rather than silently passing.
  assert.ok(mapped.size >= 15, `expected the palette map to cover 15+ vars, matched ${mapped.size}`)
})

test('a colour utility is spelled like the CSS variable it reads', () => {
  // `bg-indigo-brand` read `--indigo`: two names for one token. ToneBadge asked
  // for the natural `bg-indigo`, got nothing, and shipped an unstyled chip
  // (0.8.29). Tailwind only defines numbered indigo shades, so the plain stem is
  // free — `teal` always shipped this way. The old names stayed as aliases until
  // the apps were confirmed off them (0.13.0).
  const { theme } = renderCss(tokens)
  const pairs = [...theme.matchAll(/--color-([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/g)].map((m) => [m[1], m[2]])
  const renamed = pairs.filter(([utility, cssVar]) => utility !== cssVar)
  assert.deepEqual(
    renamed,
    [],
    `utilities named differently from their variable — one token, two spellings: ${renamed.map(([u, v]) => `${u} → --${v}`).join(', ')}`,
  )
  const utilities = new Set(pairs.map(([utility]) => utility))
  for (const name of ['indigo', 'indigo-deep']) assert.ok(utilities.has(name), `--color-${name} should ship`)
  // Anti-vacuity: fail if the regex stops matching rather than silently passing.
  assert.ok(pairs.length >= 45, `expected 45+ colour utilities, matched ${pairs.length}`)
})

test('every type size ships the line height its utility renders', () => {
  // `text-sm` has always rendered 13.6px on a 142.857% line: Tailwind's default
  // pairing, inherited silently when Quill re-cut the sizes. Nothing declared it,
  // so hand-typed text styles drifted (Body/S at 160%).
  // `2xs` is Quill's own size with no pairing — it inherits, on purpose.
  const { theme, root } = renderCss(tokens)
  for (const size of Object.keys(tokens.text)) {
    const declared = new RegExp(`--text-${size}--line-height:\\s*([^;]+);`).exec(root)
    const mapped = new RegExp(`--text-${size}--line-height:\\s*([^;]+);`).exec(theme)
    if (size === '2xs') { assert.equal(declared ?? mapped, null, '2xs inherits its line height'); continue }
    assert.ok(declared, `--text-${size}--line-height should ship`)
    assert.equal(declared[1], tokens.textLeading[size])
    assert.equal(mapped?.[1], `var(--text-${size}--line-height)`, `text-${size} reads the Quill variable`)
  }
})

test('the leading and tracking roles ship as utilities and as variables', () => {
  const { theme, root } = renderCss(tokens)
  for (const [k, v] of Object.entries(tokens.leading)) {
    assert.match(theme, new RegExp(`--leading-${k}:\\s*${v.replace('.', '\\.')};`), `leading-${k} utility`)
    // In :root too: `@theme inline` never emits a variable, and the base layer reads these.
    assert.match(root, new RegExp(`--leading-${k}:\\s*${v.replace('.', '\\.')};`), `--leading-${k} variable`)
  }
  for (const [k, v] of Object.entries(tokens.tracking)) {
    assert.match(theme, new RegExp(`--tracking-${k}:\\s*${v.replace('.', '\\.')};`), `tracking-${k} utility`)
    assert.match(root, new RegExp(`--tracking-${k}:\\s*${v.replace('.', '\\.')};`), `--tracking-${k} variable`)
  }
})

test('a leading or tracking role never reuses one of Tailwind\'s own names', () => {
  // The documented scale said snug / tight / wide. Tailwind owns those with other
  // values (leading-snug is 1.375, tracking-wide 0.025em) and shipped components
  // use them, so redefining one would silently re-space text that never asked.
  // Roles are named for the text they set, which also tells an agent when to use one.
  const defaults = readFileSync(new URL('../node_modules/tailwindcss/theme.css', import.meta.url), 'utf8')
  const owned = (ns) => new Set([...defaults.matchAll(new RegExp(`--${ns}-([a-z]+):`, 'g'))].map((m) => m[1]))
  assert.ok(owned('leading').has('snug') && owned('tracking').has('tight'), 'Tailwind theme not read — guard is vacuous')
  assert.deepEqual(Object.keys(tokens.leading).filter((k) => owned('leading').has(k)), [])
  assert.deepEqual(Object.keys(tokens.tracking).filter((k) => owned('tracking').has(k)), [])
})

test('the sanctioned tints are declared in the token source, each cut from a real colour', () => {
  // Which opacities the system uses on purpose is a design decision, so it lives in the
  // token source; src/usage/roles.mjs says what each is for.
  assert.equal(tokens.tints.length, 20)
  const colours = new Set()
  const walk = (o, path) => { for (const [k, v] of Object.entries(o)) { if (v && 'light' in v && 'dark' in v) colours.add(cssVarName([...path, k]).slice(2)); else if (v && typeof v === 'object') walk(v, [...path, k]) } }
  walk(tokens.color, [])
  for (const { of, pct } of tokens.tints) {
    assert.ok(of in tokens.semantic || colours.has(of), `tint '${of}/${pct}': '${of}' is neither a contract role nor a colour primitive`)
    assert.ok(pct > 0 && pct < 100, `tint '${of}/${pct}': opacity out of range`)
  }
})

test('--space-N is the step Tailwind renders for p-N, so the variable and the class never disagree', () => {
  // Nothing reads --space-* (not shipped code, not the site, not the app): components
  // write `p-4`. The variables stay because they are the CSS name behind Paper's
  // `--spacing-*` tokens and the documented scale — only honest while both are 0.25rem × N.
  const defaults = readFileSync(new URL('../node_modules/tailwindcss/theme.css', import.meta.url), 'utf8')
  const step = defaults.match(/--spacing:\s*([\d.]+)rem;/)
  assert.ok(step, 'Tailwind theme not read — guard is vacuous')
  let checked = 0
  for (const [k, v] of Object.entries(tokens.spacing)) {
    assert.ok(Math.abs(parseFloat(v) - Number(k) * Number(step[1])) < 1e-9, `--space-${k} is ${v}; Tailwind's p-${k} renders ${Number(k) * Number(step[1])}rem`)
    checked++
  }
  assert.ok(checked >= 15)
})

test('the CLI payload registers no class for a primitive: cssVars.light holds only the contract', () => {
  // The shadcn CLI turns EVERY colour in `cssVars.light` into a `--color-*` theme key.
  // With all of :root there, an installed app got 271 classes nobody asked for —
  // `bg-dk-paper`, `bg-cd-indigo-deep`, `bg-int-ink` — in the stylesheet its agents
  // read (measured with the real CLI in a scratch app: 103 keys asked for, 374
  // written). Everything that is not a contract role now rides in the `css` field,
  // which the CLI writes verbatim and registers nothing for.
  const payload = registryPayload(renderCss(tokens))
  assert.deepEqual(Object.keys(payload.cssVars.light).sort(), [...Object.keys(tokens.semantic), 'radius'].sort())
  const root = payload.css[':root']
  for (const k of ['--paper', '--dk-paper', '--int-ink', '--success', '--space-4', '--leading-reading', '--shadow-xs']) assert.ok(k in root, `${k} should ride in css[':root']`)
  for (const k of Object.keys(root)) assert.match(k, /^--[a-z0-9_-]+$/)
  // Nothing dropped on the way: every :root declaration lands in exactly one place.
  const declared = [...renderCss(tokens).root.matchAll(/^\s*--([a-z0-9_-]+)\s*:/gm)].map((m) => m[1])
  const carried = new Set([...Object.keys(payload.cssVars.light), ...Object.keys(root).map((k) => k.slice(2))])
  assert.deepEqual(declared.filter((k) => !carried.has(k)), [])
  assert.equal(Object.keys(payload.cssVars.light).filter((k) => `--${k}` in root).length, 0)
})

test('a CLI install receives the dark variant, so dark: follows Quill\'s dark themes in an app', () => {
  // Stock shadcn primitives carry 71 `dark:` tweaks (`dark:bg-input/30`…). A stock
  // app defines `dark` as `.dark *`, so on `data-theme="dark"` none of them fired
  // and Dusk in an app differed from Dusk in Storybook, where the site defines the
  // variant. The CLI writes an at-rule from the `css` field, and Tailwind honours the
  // LAST definition of a custom variant (compiled: stock then ours → ours), so the
  // shipped rule keeps `.dark *` and adds every dark-scheme theme.
  const payload = registryPayload(renderCss(tokens))
  const rules = Object.keys(payload.css).filter((k) => k.startsWith('@custom-variant dark '))
  assert.equal(rules.length, 1)
  assert.deepEqual(payload.css[rules[0]], {})
  assert.ok(rules[0].includes('.dark *'), 'an app toggling the stock .dark class must keep working')
  for (const m of MODES.filter((m) => m.colorScheme === 'dark')) assert.ok(rules[0].includes(`[data-theme="${m.attr}"] *`), `${m.attr} missing from the shipped variant`)
  for (const m of MODES.filter((m) => m.colorScheme !== 'dark')) assert.equal(rules[0].includes(`[data-theme="${m.attr}"]`), false, `${m.attr} is a light theme`)
  assert.equal(Object.keys(payload.css)[0], rules[0], 'first, so it is in place before anything that reads it')
})

test('the dark: variant covers every theme whose color-scheme is dark', () => {
  const selector = darkVariant()
  const dark = MODES.filter((m) => m.colorScheme === 'dark')
  const light = MODES.filter((m) => m.colorScheme !== 'dark')
  assert.ok(dark.length >= 3, `expected 3+ dark modes, found ${dark.length}`)
  for (const m of dark) {
    assert.ok(
      selector.includes(`[data-theme="${m.attr}"]`),
      `dark theme '${m.attr}' is missing from the dark: variant — every dark: utility renders its light treatment there`,
    )
  }
  for (const m of light) {
    assert.ok(!selector.includes(`[data-theme="${m.attr}"]`), `light theme '${m.attr}' must not trigger dark: utilities`)
  }
})

test('registry payload: cssVars keys are bare, css block keys carry the -- prefix', () => {
  // shadcn's CLI prepends `--` to cssVars keys but writes `css` keys verbatim.
  // With bare `css` keys it emitted `paper: var(--dk-paper);` in every theme
  // and accent block — invalid CSS, silently dropped — so a CLI-installed app
  // could not switch theme or accent. Caught with the real CLI on 2026-09-14.
  const css = renderCss(tokens)
  const payload = registryPayload(css)
  for (const [bucket, vars] of Object.entries(payload.cssVars)) {
    for (const k of Object.keys(vars)) assert.ok(!k.startsWith('--'), `cssVars.${bucket} key '${k}' must be bare`)
  }
  const selectors = Object.keys(payload.css)
  assert.equal(selectors.length, 2 + css.modes.length + css.accents.length + Object.keys(AI_RULES).length + Object.keys(FORCED_COLORS_RULES).length) // the dark variant + ':root' + themes + accents + AI utilities/keyframes + the forced-colours focus rule
  for (const [selector, block] of Object.entries(payload.css)) {
    if (selector.startsWith('@')) continue // an at-rule carries no declarations
    const keys = Object.keys(block)
    assert.ok(keys.length > 0, `${selector} has no declarations`)
    for (const k of keys) assert.match(k, /^--[a-z0-9_-]+$/, `${selector} key '${k}' must be a custom-property name`)
  }
  // Nothing lost in translation: the dark block carries every --var its CSS body declares.
  const darkBody = css.modes.find((m) => m.attr === 'dark').body
  const declared = [...darkBody.matchAll(/^\s*--([a-z0-9-]+)\s*:/gm)].length
  assert.equal(Object.keys(payload.css['[data-theme="dark"]']).length, declared)
  assert.equal(payload.css['[data-theme="dark"]']['--paper'], 'var(--dk-paper)')
})

test('AI utilities: every one is generated, with reduced-motion stills for the animated ones', () => {
  const css = renderAiUtilities()
  for (const name of AI_UTILITIES) assert.match(css, new RegExp(`@utility ${name} \\{`), `missing @utility ${name}`)
  for (const name of ['ai-edge-working', 'ai-line', 'ai-shimmer']) {
    const block = css.slice(css.indexOf(`@utility ${name} {`))
    assert.match(block.slice(0, block.indexOf('\n}\n') + 2), /prefers-reduced-motion: reduce[\s\S]*animation: none/, `${name} must stop under reduced motion`)
  }
  for (const k of ['ai-sweep', 'ai-line', 'ai-shimmer']) assert.match(css, new RegExp(`@keyframes ${k} \\{`))
  assert.doesNotMatch(css, /accent-pigment/, 'the AI gradient is fixed across accents')
})

test('AI utilities ride in the CLI payload as well as the theme file', () => {
  const payload = registryPayload(renderCss(tokens))
  for (const name of AI_UTILITIES) assert.ok(payload.css[`@utility ${name}`], `CLI payload lacks @utility ${name}`)
  for (const k of ['ai-sweep', 'ai-line', 'ai-shimmer']) assert.ok(payload.css[`@keyframes ${k}`], `CLI payload lacks @keyframes ${k}`)
})

// WCAG 2.4.7 in Windows High Contrast (`forced-colors: active`). The browser drops every box-shadow
// there, and a stock shadcn field, dropdown or button draws its focus ring as one while its `outline-none`
// removes the outline: keyboard focus vanished (CRA-294). Those components are the app's own files, so the
// theme carries one rule that gives every focused element an outline in that mode, and only in that mode.
const FORCED = '@media (forced-colors: active)'

test('forced colours: one rule gives every focused element a 2px system-colour outline', () => {
  assert.deepEqual(Object.keys(FORCED_COLORS_RULES), [FORCED], 'everything in it sits inside the forced-colours query')
  const inside = FORCED_COLORS_RULES[FORCED]
  // Every focusable element, not a list of selectors to keep up to date.
  // Then the one opt-in, AFTER the general rule: an element that fills a parent which clips (a scroll area in a
  // popover, a full-width row in a scrolling list) would have an outside outline cut off, so it asks for the
  // outline inside itself with `data-focus-inset`. Only the offset changes; the outline is the general one.
  assert.deepEqual(Object.keys(inside), [':focus-visible', '[data-focus-inset]:focus-visible'])
  // 2px, through the border-width token, so the rule an app inherits reads as Quill's value
  assert.equal(tokens.borderWidth[2], '2px')
  assert.deepEqual(inside[':focus-visible'], { outline: 'var(--border-width-2) solid Highlight', 'outline-offset': 'var(--border-width-2)' })
  assert.deepEqual(inside['[data-focus-inset]:focus-visible'], { 'outline-offset': 'calc(var(--border-width-2) * -1)' })
  assert.equal(
    renderForcedColors(),
    '@media (forced-colors: active) {\n  :focus-visible {\n    outline: var(--border-width-2) solid Highlight;\n    outline-offset: var(--border-width-2);\n  }\n  [data-focus-inset]:focus-visible {\n    outline-offset: calc(var(--border-width-2) * -1);\n  }\n}',
  )
})

test('forced colours: the rule wins by being unlayered, not by !important', () => {
  // An app's `outline-none` lives in Tailwind's `utilities` layer, and CSS outside every layer beats
  // all of them whatever the specificity. So the rule must stay at the top level of the theme (never
  // inside `@layer base`, which utilities beat), and then it needs no `!important`.
  assert.doesNotMatch(renderForcedColors(), /!important/)
  assert.doesNotMatch(renderForcedColors(), /@layer/)
  const block = registryBlock(renderCss(tokens))
  const at = block.indexOf(renderForcedColors())
  assert.ok(at > 0, 'the theme file must carry the rule')
  const before = block.slice(0, at)
  assert.equal(before.split('{').length, before.split('}').length, 'the rule must open at the top level of the theme file, inside no other block')
})

test('forced colours: the rule is in the theme file, the site stylesheet and the CLI payload, and nowhere outside its query', () => {
  const rendered = renderForcedColors()
  const count = (text, needle) => text.split(needle).length - 1
  for (const file of ['registry/themes/quill.css', 'src/app/globals.css']) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.equal(count(text, rendered), 1, `${file} must carry the rule exactly once`)
    // Nothing of it leaks out of the query: the system colour and a bare `:focus-visible` rule appear only there.
    assert.equal(count(text, 'Highlight'), count(rendered, 'Highlight'), `${file}: Highlight is used outside the forced-colours rule`)
    assert.equal(count(text, 'forced-colors'), 1, `${file}: one forced-colours query, the generated one`)
    assert.equal([...text.matchAll(/^\s*:focus-visible\s*\{/gm)].length, 1, `${file}: a bare :focus-visible rule exists outside the forced-colours query`)
    assert.equal(count(text, '[data-focus-inset]'), 1, `${file}: data-focus-inset is styled outside the forced-colours rule`)
  }
  // Built by `shadcn build` from registry.json, which build-tokens writes: the file an app's CLI reads.
  const item = JSON.parse(readFileSync(new URL('../public/r/quill.json', import.meta.url), 'utf8'))
  assert.deepEqual(item.css[FORCED], FORCED_COLORS_RULES[FORCED], 'public/r/quill.json must carry the rule in its css field')
  for (const [key, value] of Object.entries(item.css)) {
    if (key === FORCED) continue
    assert.doesNotMatch(key, /focus-visible|forced-colors/, `css key '${key}' styles focus outside the forced-colours query`)
    assert.doesNotMatch(JSON.stringify(value), /Highlight|:focus-visible|forced-colors/, `css['${key}'] styles focus outside the forced-colours query`)
  }
  // The same payload from the generator, top level: the CLI writes a top-level key outside every layer.
  assert.deepEqual(registryPayload(renderCss(tokens)).css[FORCED], FORCED_COLORS_RULES[FORCED])
})

// WCAG 1.4.11: the composer's edge is the box's only boundary, so every stop of
// every edge gradient must reach 3:1 against the paper, at rest, lit and working,
// in every theme. The stops are read from AI_RULES and evaluated here (var() from
// the tokens, color-mix in OKLab as the browser does), so a change to a token or to
// a mix percentage is measured, not assumed.
test('AI edge: every gradient stop is >= 3:1 against the paper, at rest, lit and working, in every theme', () => {
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const toGamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
  const toOklab = (rgb) => {
    const [r, g, b] = rgb.map(toLinear)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]
  }
  const fromOklab = ([L, a, b]) => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
      .map(toGamma).map((c) => Math.min(1, Math.max(0, c)))
  }
  const luminance = (rgb) => { const [r, g, b] = rgb.map(toLinear); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) }
  // Split on top-level commas only (color-mix nests its own).
  const splitTop = (str) => {
    const parts = []; let depth = 0; let start = 0
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '(') depth++
      else if (str[i] === ')') depth--
      else if (str[i] === ',' && depth === 0) { parts.push(str.slice(start, i).trim()); start = i + 1 }
    }
    return [...parts, str.slice(start).trim()]
  }
  const resolveVar = (name, mode) => {
    if (name.startsWith('ai-')) return hex(tokens.color.ai[name.slice(3)][mode])
    if (name === 'line-control') return hex(tokens.color.line.control[mode])
    throw new Error(`edge stop uses var(--${name}); teach this test its token`)
  }
  const evaluate = (expr, mode) => {
    const v = /^var\(--([a-z-]+)\)$/.exec(expr)
    if (v) return resolveVar(v[1], mode)
    const mix = /^color-mix\(in oklab, (.*)\)$/.exec(expr)
    assert.ok(mix, `cannot evaluate edge stop '${expr}'`)
    const [first, second] = splitTop(mix[1])
    const pct = /^(.*) (\d+(?:\.\d+)?)%$/.exec(first)
    assert.ok(pct && !/%$/.test(second), `color-mix '${expr}' must give one percentage, on its first colour`)
    const weight = Number(pct[2]) / 100
    const [a, b] = [toOklab(evaluate(pct[1], mode)), toOklab(evaluate(second, mode))]
    return fromOklab(a.map((x, i) => x * weight + b[i] * (1 - weight)))
  }
  // The border-box layer: the second top-level layer of `background`, `linear-gradient(<angle>, stops…) border-box`.
  const stopsOf = (background) => {
    const layer = splitTop(background)[1]
    const inner = /^linear-gradient\((.*)\) border-box$/.exec(layer)
    assert.ok(inner, `unexpected edge layer '${layer}'`)
    return splitTop(inner[1]).slice(1).map((stop) => stop.replace(/ \d+%$/, ''))
  }
  const states = {
    rest: AI_RULES['@utility ai-edge'].background,
    lit: AI_RULES['@utility ai-edge']['&:focus-within, &[data-lit]'].background,
    working: AI_RULES['@utility ai-edge-working'].background,
  }
  const modes = Object.keys(tokens.color.paper.base)
  assert.equal(modes.length, 5)
  const failures = []
  for (const mode of modes) {
    const paper = hex(tokens.color.paper.base[mode])
    for (const [state, background] of Object.entries(states)) {
      const stops = stopsOf(background)
      assert.ok(stops.length >= 3, `${state} edge should carry the three Ember stops`)
      for (const stop of stops) {
        const ratio = contrast(evaluate(stop, mode), paper)
        if (ratio < 3) failures.push(`${mode} ${state} '${stop}' ${ratio.toFixed(2)}:1`)
      }
    }
  }
  assert.deepEqual(failures, [], `edge stops below 3:1:\n${failures.join('\n')}`)
})

test('ai-meter is a still, left-to-right fill built from the edge stops', () => {
  const rule = AI_RULES['@utility ai-meter']
  assert.ok(rule, 'no ai-meter utility')
  assert.ok(AI_UTILITIES.includes('ai-meter'), 'ai-meter is not in AI_UTILITIES')
  // The lit edge's stops (its gold end pulled toward the gold text cut), turned to run left to right.
  assert.equal(rule['background-image'], 'linear-gradient(90deg, color-mix(in oklab, var(--ai-from) 55%, var(--ai-text-from)), var(--ai-via) 50%, var(--ai-to))')
  assert.equal(rule.animation, undefined, 'a meter shows an amount: it must not move')
  for (const file of ['registry/themes/quill.css', 'src/app/globals.css']) {
    assert.ok(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').includes('@utility ai-meter'), `${file} does not carry ai-meter (run build:tokens)`)
  }
})

test('the gradient rule names seven placements, the meter last', () => {
  const text = renderPrinciples({ blockCount: 1 })
  assert.match(text, /Seven placements:/)
  assert.match(text, /the fill of an AI usage meter\./)
  assert.match(text, /in its seven placements/)
  assert.doesNotMatch(text, /[Ss]ix placements/)
})

test('every size step ships: its value in :root, widths on the container family, heights on the spacing family, each with a job', async () => {
  const { SIZE_JOBS } = await import('../src/usage/sizes.mjs')
  const { theme, root } = renderCss(tokens)
  for (const [group, family] of [['width', 'container'], ['height', 'spacing']]) {
    for (const [k, v] of Object.entries(tokens.size[group])) {
      assert.match(root, new RegExp(`--size-${k}:\\s*${v.replace('.', '\\.')};`), `--size-${k} holds its value`)
      assert.match(theme, new RegExp(`--${family}-${k}:\\s*var\\(--size-${k}\\);`), `${group} ${k} rides the ${family} family`)
      assert.ok(SIZE_JOBS[group][k], `size ${k} needs a job in src/usage/sizes.mjs`)
    }
    assert.deepEqual(Object.keys(SIZE_JOBS[group]).sort(), Object.keys(tokens.size[group]).sort(), `src/usage/sizes.mjs names exactly the ${group} steps`)
  }
  // a name used for both a width and a height would make w-x and h-x two different sizes
  assert.deepEqual(Object.keys(tokens.size.width).filter((k) => k in tokens.size.height), [])
})
