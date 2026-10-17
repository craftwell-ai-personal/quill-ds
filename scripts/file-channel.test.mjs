import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { compile } from 'tailwindcss'
import { checkData } from './build-check.mjs'

// The file channel, proven. An app that installs the theme as a FILE gets every Quill
// utility (font-heading, text-2xs, the role and status classes, the pigments) and the
// dark: variant from one line — `@import "./quill-theme.css"` inside the stylesheet
// that holds `@import "tailwindcss"` — because the shipped file carries the @theme block
// and the variant since 0.12.0. Imported from a layout instead, both are inert: that
// is the trap tech-careers sat in (CRA-175), and this test keeps both facts true.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const req = createRequire(join(root, 'package.json'))

async function buildWith(entryCss, candidates) {
  const loadStylesheet = async (id, base) => {
    if (id === 'tailwindcss') { const p = req.resolve('tailwindcss/index.css'); return { base: dirname(p), content: readFileSync(p, 'utf8') } }
    if (/^https?:/.test(id)) return { base, content: '' } // the Google Fonts import: a browser concern, not Tailwind's
    const p = resolve(base, id)
    return { base: dirname(p), content: readFileSync(p, 'utf8') }
  }
  const c = await compile(entryCss, { base: root, loadStylesheet })
  return c.build(candidates)
}
const escape = (s) => s.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch)
const resolves = (css, cls) => css.includes('.' + escape(cls))

test('imported from inside the Tailwind stylesheet, the shipped theme file makes every Quill utility live', async () => {
  const classes = checkData().quillClasses
  const css = await buildWith(`@import "tailwindcss";\n@import "./registry/themes/quill.css";\n`, classes)
  const dead = classes.filter((c) => !resolves(css, c))
  assert.deepEqual(dead, [], `${dead.length} Quill utilities produce no CSS through the file channel`)
  assert.ok(classes.length > 900, `expected the full utility set, got ${classes.length}`)
})

test('…and the dark: variant follows Quill\'s dark themes, with the stock .dark class kept', async () => {
  const css = await buildWith(`@import "tailwindcss";\n@import "./registry/themes/quill.css";\n`, ['dark:bg-paper'])
  const rule = css.match(/\.dark\\:bg-paper[^{]*/)?.[0] ?? ''
  assert.match(rule, /\.dark \*/, 'stock .dark class must keep working')
  for (const mode of ['dark', 'classic-dark', 'intelligent']) assert.match(rule, new RegExp(`\\[data-theme="${mode}"\\]`), `dark: must fire on data-theme="${mode}"`)
})

test('imported from a layout instead (outside the Tailwind stylesheet), the utilities are inert — the documented trap', async () => {
  const css = await buildWith('@import "tailwindcss";\n', ['font-heading', 'text-2xs', 'bg-background'])
  for (const c of ['font-heading', 'text-2xs', 'bg-background']) assert.ok(!resolves(css, c), `${c} should not exist without the theme in the entry`)
})

test('order matters: a stock @custom-variant dark line BELOW the import wins, so the docs say "import it as the last line"', async () => {
  const above = await buildWith('@import "tailwindcss";\n@custom-variant dark (&:is(.dark *));\n@import "./registry/themes/quill.css";\n', ['dark:bg-card'])
  assert.match(above.match(/\.dark\\:bg-card[^{]*/)[0], /data-theme="dark"/, 'import below the stock line: Quill wins')
  const below = await buildWith('@import "tailwindcss";\n@import "./registry/themes/quill.css";\n@custom-variant dark (&:is(.dark *));\n', ['dark:bg-card'])
  assert.doesNotMatch(below.match(/\.dark\\:bg-card[^{]*/)[0], /data-theme/, 'stock line below the import: Quill loses — the case the self-check reports')
})

// What `shadcn init` writes (CLI 4.22, measured in a fresh app 2026-10-16): its own dark line, then
// its own radius lines and --radius. The docs used to say "below the dark line", which is ABOVE
// these, and there they beat Quill's: rounded-xl rendered 14px, not 16px. As the last line, Quill wins.
const STOCK_APP = '@import "tailwindcss";\n\n@custom-variant dark (&:is(.dark *));\n\n@theme inline {\n  --radius-sm: calc(var(--radius) * 0.6);\n  --radius-md: calc(var(--radius) * 0.8);\n  --radius-lg: var(--radius);\n  --radius-xl: calc(var(--radius) * 1.4);\n}\n\n:root {\n  --radius: 0.625rem;\n}\n'
test('order matters: imported as the LAST line of a stock shadcn stylesheet, Quill\'s radii and dark variant both win', async () => {
  const classes = ['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'dark:bg-card']
  const last = await buildWith(`${STOCK_APP}@import "./registry/themes/quill.css";\n`, classes)
  for (const k of ['sm', 'md', 'lg', 'xl']) assert.match(ruleFor(last, `rounded-${k}`), new RegExp(`border-radius:\\s*var\\(--radius-${k}\\)`), `rounded-${k}`)
  assert.match(last.match(/\.dark\\:bg-card[^{]*/)[0], /data-theme="dark"/)
  // and Quill's --radius is the one in force: its :root comes after the stock one
  assert.ok(last.lastIndexOf('--radius: 0.5rem') > last.lastIndexOf('--radius: 0.625rem'))
  // the old placement, below the dark line, loses every radius to the stock lines
  const above = await buildWith(STOCK_APP.replace('(&:is(.dark *));\n', '(&:is(.dark *));\n@import "./registry/themes/quill.css";\n'), classes)
  assert.match(ruleFor(above, 'rounded-xl'), /calc\(var\(--radius\) \* 1\.4\)/, 'imported above the stock radius lines, Quill loses')
})

// Keyboard focus in Windows High Contrast (CRA-294). The theme's forced-colours rule has to beat the
// `outline-none` on an app's stock fields and buttons, and it does that by position in the cascade, not by
// `!important`: Tailwind puts `outline-none` in its `utilities` layer, and CSS outside every layer beats
// every layer. So the thing to keep true is where the rule LANDS in an app's compiled stylesheet, through
// each of the two channels. (The computed outline is measured in a browser by the Forced colours story.)
const STOCK_FOCUS = ['outline-none', 'outline-hidden', 'focus-visible:ring-3', 'focus-visible:border-ring']

// The at-rules a piece of the stylesheet sits inside, outermost first.
function enclosingAtRules(css, index) {
  const stack = []
  let prelude = ''
  for (const ch of css.slice(0, index)) {
    if (ch === '{') { stack.push(prelude.trim()); prelude = '' }
    else if (ch === '}') { stack.pop(); prelude = '' }
    else if (ch === ';') prelude = ''
    else prelude += ch
  }
  return stack
}

function assertFocusRuleWins(css, channel) {
  const rules = [...css.matchAll(/:focus-visible\s*\{\s*outline:\s*var\(--border-width-2\) solid Highlight;\s*outline-offset:\s*var\(--border-width-2\);?\s*\}/g)]
  assert.equal(rules.length, 1, `${channel}: the compiled stylesheet must carry the forced-colours focus rule once`)
  const around = enclosingAtRules(css, rules[0].index)
  assert.deepEqual(around, ['@media (forced-colors: active)'], `${channel}: the rule must sit inside the forced-colours query and inside no @layer`)
  // The opt-in for an outline drawn inside the element: same query, no layer, and AFTER the general rule.
  const inset = [...css.matchAll(/\[data-focus-inset\]:focus-visible\s*\{\s*outline-offset:\s*calc\(var\(--border-width-2\) \* -1\);?\s*\}/g)]
  assert.equal(inset.length, 1, `${channel}: the compiled stylesheet must carry the data-focus-inset rule once`)
  assert.deepEqual(enclosingAtRules(css, inset[0].index), ['@media (forced-colors: active)'], `${channel}: the inset rule must sit in the same query, inside no @layer`)
  assert.ok(inset[0].index > rules[0].index, `${channel}: the inset rule must come after the general one`)
  // The class it has to beat is layered, which is why an unlayered rule wins without !important.
  const stock = css.search(/\.outline-none\s*\{/)
  assert.ok(stock > 0, `${channel}: expected the stock outline-none utility in the build`)
  assert.equal(enclosingAtRules(css, stock)[0], '@layer utilities', `${channel}: outline-none is expected in Tailwind's utilities layer`)
}

test('file channel: the forced-colours focus rule reaches an app outside every layer, so it beats a stock outline-none', async () => {
  const css = await buildWith(`@import "tailwindcss";\n@import "./registry/themes/quill.css";\n`, STOCK_FOCUS)
  assertFocusRuleWins(css, 'file channel')
})

test('CLI channel: the shadcn CLI writes the rule from the css payload outside every layer too', async () => {
  // shadcn's own merger, the code `npx shadcn add` runs on an app's stylesheet. It is the CLI's internal
  // module: if this import breaks after a shadcn upgrade, re-prove the CLI channel rather than skip it.
  // (`@shadcn/registry` comes in with `shadcn`; it is not a dependency of its own.)
  const merger = '@shadcn/registry/internal/utils/updaters/update-css'
  const { transformCss } = await import(merger).catch((error) => {
    throw new Error(`shadcn moved its CSS merger: update the import in scripts/file-channel.test.mjs (tried '${merger}': ${error.message})`)
  })
  assert.equal(typeof transformCss, 'function', `shadcn moved its CSS merger: update the import in scripts/file-channel.test.mjs ('${merger}' no longer exports transformCss)`)
  const item = JSON.parse(readFileSync(join(root, 'public/r/quill.json'), 'utf8'))
  // The shape of a fresh shadcn app's stylesheet: it has its own base layer, which the rule must not be folded
  // into. (Only the `css` field is merged here; the colour roles ride in `cssVars`, which this test does not need.)
  const stockApp = '@import "tailwindcss";\n\n@custom-variant dark (&:is(.dark *));\n\n@layer base {\n  * {\n    outline-color: currentColor;\n  }\n}\n'
  // Merged twice, as an app that updates the theme does: the rule must not pile up.
  const merged = await transformCss(await transformCss(stockApp, item.css), item.css)
  assert.equal(merged.split('@media (forced-colors: active)').length - 1, 1, 'installing twice must not write the rule twice')
  const css = await buildWith(merged, STOCK_FOCUS)
  assertFocusRuleWins(css, 'CLI channel')
})

// ---------------------------------------------------------------- Quill variables reach the inspector
// What an inspected element shows is the declaration Tailwind wrote. Every size utility must write a Quill
// variable — not Tailwind's `calc(var(--spacing) * 4)`, not a raw `0.375rem` — through both channels.
const SIZE_UTILITIES = {
  'p-4': /padding:\s*var\(--space-4\)/,
  'px-3.5': /padding-inline:\s*var\(--space-3_5\)/,
  '-m-2': /margin:\s*calc\(var\(--space-2\) \* -1\)/,
  'gap-2.5': /gap:\s*var\(--space-2_5\)/,
  'text-sm': /font-size:\s*var\(--text-sm\);\s*line-height:\s*var\(--tw-leading, var\(--text-sm--line-height\)\)/,
  border: /border-width:\s*var\(--border-width-1\)/,
  'border-2': /border-width:\s*var\(--border-width-2\)/,
  'ring-2': /calc\(var\(--border-width-2\) \+ var\(--tw-ring-offset-width\)\)/,
  'outline-2': /outline-width:\s*var\(--border-width-2\)/,
  'w-card': /width:\s*var\(--size-card\)/,
  'max-w-page': /max-width:\s*var\(--size-page\)/,
  'h-frame': /height:\s*var\(--size-frame\)/,
  'min-h-touch': /min-height:\s*var\(--size-touch\)/,
  'size-4.5': /width:\s*var\(--space-4_5\)/,
}
const ruleFor = (css, cls) => css.match(new RegExp(`\\.${escape(cls).replace(/\\/g, '\\\\')}\\s*\\{([^}]*)\\}`))?.[1] ?? ''

test('file channel: every size utility writes a Quill variable, so the inspector shows Quill tokens', async () => {
  const classes = [...Object.keys(SIZE_UTILITIES), 'rounded-md', 'rounded-xl']
  const css = await buildWith(`@import "tailwindcss";\n@import "./registry/themes/quill.css";\n`, classes)
  for (const [cls, decl] of Object.entries(SIZE_UTILITIES)) assert.match(ruleFor(css, cls), decl, cls)
  assert.match(ruleFor(css, 'rounded-md'), /border-radius:\s*var\(--radius-md\)/)
  assert.match(ruleFor(css, 'rounded-xl'), /border-radius:\s*var\(--radius-xl\)/)
  // a step Quill does not have still compiles to Tailwind's multiplier: the theme cannot stop it, quill-check flags it
  assert.match(ruleFor(await buildWith(`@import "tailwindcss";\n@import "./registry/themes/quill.css";\n`, ['p-13']), 'p-13'), /calc\(var\(--spacing\) \* 13\)/)
})

test('CLI channel: the merged cssVars point the same utilities at Quill variables', async () => {
  const { transformCssVars } = await import('@shadcn/registry/internal/utils/updaters/update-css-vars')
  const { transformCss } = await import('@shadcn/registry/internal/utils/updaters/update-css')
  const item = JSON.parse(readFileSync(join(root, 'public/r/quill.json'), 'utf8'))
  const stockApp = '@import "tailwindcss";\n\n@custom-variant dark (&:is(.dark *));\n\n@theme inline {\n  --radius-md: calc(var(--radius) - 2px);\n}\n\n:root {\n  --radius: 0.625rem;\n}\n'
  const merged = await transformCss(await transformCssVars(stockApp, item.cssVars, { tailwind: { cssVariables: true } }, { tailwindVersion: 'v4', overwriteCssVars: true }), item.css)
  const css = await buildWith(merged, [...Object.keys(SIZE_UTILITIES), 'rounded-md'])
  for (const [cls, decl] of Object.entries(SIZE_UTILITIES)) assert.match(ruleFor(css, cls), decl, cls)
  assert.match(ruleFor(css, 'rounded-md'), /border-radius:\s*var\(--radius-md\)/)
  // the values ride in the merged :root, so each variable resolves in the app
  for (const name of ['--space-3_5', '--radius-md', '--text-sm', '--text-sm--line-height', '--border-width-2', '--size-card', '--size-frame']) assert.match(merged, new RegExp(`${name}:\\s*[^;]+;`), name)
})
