import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tokens } from '../src/tokens/quill.tokens.mjs'
import { MODES, DEFAULT_ACCENT } from '../src/tokens/themes.mjs'
import { isMain } from './lib/is-main.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const START = '/* @quill-tokens:start */'
const END = '/* @quill-tokens:end */'

// Non-default theme modes. `light` (Dawn) is the default and lives directly in :root;
// each mode here gets prefixed copies of every color/shadow token in :root plus a
// [data-theme="<attr>"] block that remaps the base vars — so every alias downstream
// (semantic, shadcn, Tailwind utilities) resolves per-theme for free.
// Theme metadata moved to src/tokens/themes.mjs so the browser can read it too
// (this file imports node:fs, so Storybook and app UI can never import it).
// Re-exported here because every existing caller imports MODES from this module.
export { MODES, DEFAULT_MODE, ALL_MODES, DEFAULT_ACCENT } from '../src/tokens/themes.mjs'


// 'pigment' is a grouping namespace, not part of the CSS var name.
// Trailing 'base' is the default leaf — also dropped.
export function cssVarName(path) {
  let parts = path.filter(p => p !== 'pigment') // grouping-only namespace stripped from var names; add future grouping-only namespaces here
  if (parts[parts.length - 1] === 'base') parts = parts.slice(0, -1)
  return '--' + parts.join('-')
}

// Walk color/shadow primitive groups, calling fn(varName, modeValue) for each leaf.
function walkModal(group, prefix, fn) {
  for (const [key, val] of Object.entries(group)) {
    if (val && typeof val === 'object' && 'light' in val && 'dark' in val) {
      fn(cssVarName([...prefix, key]), val)
    } else if (val && typeof val === 'object') {
      walkModal(val, [...prefix, key], fn)
    }
  }
}

// Every alias that ships as a plain variable: the status roles, then the contract.
// The names retired in 0.10.0 left the CSS in 0.13.0 (see `retired` in the source).
const aliasGroups = (t) => [...Object.entries(t.status), ...Object.entries(t.semantic)]

export function renderCss(t) {
  const rootLines = []
  const prefixedLines = []
  const modeLines = Object.fromEntries(MODES.map((m) => [m.key, []]))

  // Emit one leaf: --name (light) in :root, a prefixed copy per mode, and a
  // remap line inside each mode's [data-theme] block.
  const emitLeaf = (name, leaf) => {
    rootLines.push(`  ${name}: ${leaf.light};`)
    for (const m of MODES) {
      prefixedLines.push(`  --${m.prefix}-${name.slice(2)}: ${leaf[m.key]};`)
      modeLines[m.key].push(`  ${name}: var(--${m.prefix}-${name.slice(2)});`)
    }
  }
  walkModal(t.color, [], emitLeaf)
  for (const [key, leaf] of Object.entries(t.shadow)) {
    emitLeaf(key === 'base' ? '--shadow' : `--shadow-${key}`, leaf)
  }
  // Motion + fraunces (mode-independent).
  const motion = {
    '--ease-out': t.motion.easeOut, '--ease-soft': t.motion.easeSoft,
    '--dur-fast': t.motion.durFast, '--dur': t.motion.dur, '--dur-slow': t.motion.durSlow,
    '--lift': t.motion.lift, '--lift-sm': t.motion.liftSm,
  }
  for (const [k, v] of Object.entries(motion)) rootLines.push(`  ${k}: ${v};`)
  for (const [k, v] of Object.entries(t.fraunces)) rootLines.push(`  --fraunces-${k}: ${v};`)
  // Semantic + shadcn aliases + radius base. Alias lines are ALSO re-declared
  // inside every [data-theme] block below: a custom property that references
  // another (`--background: var(--paper)`) resolves where it is DECLARED, so an
  // alias resolved at :root ignores a remap on a nested data-theme island.
  // Re-declaring at the themed element makes scoped theming work — a
  // `<div data-theme="dusk">` island inside a Dawn page — not just the
  // <html>-level switch. The accent defaults ride along for the same reason
  // (an island re-cuts the default accent to its own theme; pair a
  // data-accent attribute with data-theme for accented islands).
  const accentDefaultLines = [
    `  --accent-pigment: ${t.accents[DEFAULT_ACCENT].base};`,
    `  --accent-pigment-text: ${t.accents[DEFAULT_ACCENT].text};`,
  ]
  const aliasLines = [
    ...accentDefaultLines,
    ...aliasGroups(t).map(([k, v]) => `  --${k}: ${v};`),
  ]
  rootLines.push(...accentDefaultLines)
  rootLines.push(...Object.entries(t.status).map(([k, v]) => `  --${k}: ${v};`))
  rootLines.push(`  --radius: ${t.radiusBase};`)
  // Spacing + border-width (documented scales; kept in :root, not @theme, so they
  // don't collide with Tailwind's built-in numeric utilities).
  // Dots are illegal in CSS custom-property names — a half-step key like "2.5"
  // must emit `--space-2_5`, or a strict minifier (LightningCSS, used by the
  // production build + downstream consumers) throws and drops the whole :root block.
  for (const [k, v] of Object.entries(t.spacing)) rootLines.push(`  --space-${String(k).replace(/\./g, '_')}: ${v};`)
  for (const [k, v] of Object.entries(t.borderWidth)) rootLines.push(`  --border-width-${k}: ${v};`)
  // In :root as well as @theme: `@theme inline` writes a value into its utility
  // and never emits the variable, and the base layer (body, h1–h6) reads these.
  for (const [k, v] of Object.entries(t.leading)) rootLines.push(`  --leading-${k}: ${v};`)
  for (const [k, v] of Object.entries(t.tracking)) rootLines.push(`  --tracking-${k}: ${v};`)
  for (const [k, v] of Object.entries(t.semantic)) rootLines.push(`  --${k}: ${v};`)

  // @theme inline: fonts, color mappings, radii, type scale.
  const themeLines = []
  themeLines.push(`  --font-sans: ${t.font.sans};`)
  themeLines.push(`  --font-display: ${t.font.display};`)
  themeLines.push(`  --font-heading: ${t.font.heading};`)
  themeLines.push(`  --font-mono: ${t.font.mono};`)
  themeLines.push(`  --font-ui: ${t.font.ui};`)
  themeLines.push(`  --font-data: ${t.font.data};`)
  for (const k of Object.keys(t.semantic)) themeLines.push(`  --color-${k}: var(--${k});`)
  // Status roles get a class too. A key that starts with `text-` would produce
  // `text-text-accent-color`, so it stays a variable (the theme applies it).
  for (const k of Object.keys(t.status)) if (!k.startsWith('text-')) themeLines.push(`  --color-${k}: var(--${k});`)
  const paletteMap = {
    paper: '--paper', 'paper-warm': '--paper-warm', 'paper-deep': '--paper-deep',
    ink: '--ink', 'ink-soft': '--ink-soft', 'ink-muted': '--ink-muted',
    terracotta: '--terracotta', 'terracotta-deep': '--terracotta-deep',
    moss: '--moss', 'moss-deep': '--moss-deep',
    // Spelled like the variable: Tailwind only defines numbered indigo shades
    // (`indigo-500`), so the plain stem is free, exactly as `teal` below.
    indigo: '--indigo', 'indigo-deep': '--indigo-deep',
    // gold-text is a third cut, not a shade: gold-deep can't carry TEXT duty on
    // light grounds (3.3:1 on Dawn). Without a utility here, `text-gold-text` in
    // ToneBadge compiled to nothing and the AA fix was inert.
    gold: '--gold', 'gold-deep': '--gold-deep', 'gold-text': '--gold-text',
    teal: '--teal', 'teal-deep': '--teal-deep',
    // The accent's AA text cut. Without a utility, DESIGN.md's own eyebrow recipe
    // and stats-band had to reach it through a bracketed `text-[var(…)]`.
    'accent-pigment-text': '--accent-pigment-text',
  }
  for (const [k, v] of Object.entries(paletteMap)) themeLines.push(`  --color-${k}: ${`var(${v})`};`)
  for (const [k, v] of Object.entries(t.radius)) themeLines.push(`  --radius-${k}: ${v};`)
  // Tailwind's own key for a size's line height (`--text-sm--line-height`), so the
  // `text-*` utilities pick it up with no new class to learn.
  for (const [k, v] of Object.entries(t.text)) {
    themeLines.push(`  --text-${k}: ${v};`)
    if (t.textLeading[k]) themeLines.push(`  --text-${k}--line-height: ${t.textLeading[k]};`)
  }
  for (const [k, v] of Object.entries(t.leading)) themeLines.push(`  --leading-${k}: ${v};`)
  for (const [k, v] of Object.entries(t.tracking)) themeLines.push(`  --tracking-${k}: ${v};`)
  // Shadow utilities route through the :root tokens (remapped in dark) —
  // without these, Tailwind's shadow-* fall back to its cool-black defaults
  // and never flip in dark mode. Tailwind's 7-step scale maps onto our 5.
  const shadowMap = {
    '2xs': '--shadow-xs', xs: '--shadow-xs', sm: '--shadow-sm', md: '--shadow',
    lg: '--shadow-lg', xl: '--shadow-pop', '2xl': '--shadow-pop',
  }
  for (const [k, v] of Object.entries(shadowMap)) themeLines.push(`  --shadow-${k}: var(${v});`)

  // Aliases re-resolve against the remapped primitives on the themed element.
  for (const m of MODES) modeLines[m.key].push(...aliasLines)

  return {
    theme: themeLines.join('\n'),
    root: [...rootLines, ...prefixedLines].join('\n'),
    // `dark` kept as a named field (first mode) for existing callers/tests.
    dark: modeLines.dark.join('\n'),
    modes: MODES.map((m) => ({ attr: m.attr, colorScheme: m.colorScheme, body: modeLines[m.key].join('\n') })),
    accents: Object.entries(t.accents).map(([name, a]) => ({
      name,
      body: `  --accent-pigment: ${a.base};\n  --accent-pigment-text: ${a.text};`,
    })),
  }
}

// Every [data-theme="…"] block, in MODES order, then the [data-accent="…"] blocks.
function modeBlocks(css) {
  const themes = css.modes
    .map((m) => `[data-theme="${m.attr}"] {\n  color-scheme: ${m.colorScheme};\n\n${m.body}\n}`)
    .join('\n\n')
  const accents = css.accents
    .map((a) => `[data-accent="${a.name}"] {\n${a.body}\n}`)
    .join('\n\n')
  return `${themes}\n\n${accents}`
}

export function injectMarkers(source, block) {
  const s = source.indexOf(START)
  const e = source.indexOf(END)
  if (s === -1 || e === -1) throw new Error('markers not found')
  return source.slice(0, s + START.length) + '\n' + block + '\n' + source.slice(e)
}

// Tailwind's `dark:` variant must fire on EVERY theme whose color-scheme is
// dark, and this list is derived from MODES rather than hand-kept. It was
// hand-kept once: the intelligent theme shipped with 80 `dark:` utilities
// silently rendering their light treatment on a near-black ground, because the
// selector still named only two of the three dark themes. A sixth theme now
// joins automatically.
// Apps get it too, through the registry item's `css` field (the CLI writes an
// at-rule into the app's main stylesheet, where Tailwind processes it) AND at the
// top of the theme FILE since 0.12.0: imported from inside the stylesheet that
// holds `@import "tailwindcss"`, the file's variant and @theme are honoured
// (measured 2026-09-23); imported from a layout they are inert, as before.
// `stockClass` keeps `.dark *` in the rule: Tailwind honours the LAST definition
// of a custom variant, and an app toggling shadcn's stock class must keep working.
export function darkVariant(modes = MODES, { stockClass = false } = {}) {
  const dark = modes.filter((m) => m.colorScheme === 'dark')
  const selector = [...(stockClass ? ['.dark *'] : []), ...dark.map((m) => `[data-theme="${m.attr}"] *`)].join(', ')
  return `@custom-variant dark (&:is(${selector}));`
}

// The AI gradient treatments (DESIGN.md "The AI gradient"), as Tailwind
// utilities so they ship through BOTH channels: inside the theme file (the
// file channel honours @utility once imported into the Tailwind stylesheet)
// and in the CLI `css` payload (the CLI writes `@utility` and `@keyframes`
// keys verbatim). Plain classes would be dropped by the CLI channel.
export const AI_UTILITIES = ['ai-text', 'ai-edge', 'ai-edge-working', 'ai-wash', 'ai-glow', 'ai-line', 'ai-meter', 'ai-shimmer']

const AI_SWEEP = 'var(--ai-from), var(--ai-via), var(--ai-to), var(--ai-via), var(--ai-from)'
// The composer's edge is a control boundary, so every stop must reach WCAG 1.4.11's
// 3:1 against the paper. Raw gold measured 2.33:1 lit on Dawn (2.72:1 Classic Light),
// so the edges alone pull their gold end 45% toward the gold text cut; the hue stays
// gold and the other stops are untouched. build-tokens.test.mjs recomputes every stop.
const EDGE_FROM = 'color-mix(in oklab, var(--ai-from) 55%, var(--ai-text-from))'
const EDGE_STOPS = `${EDGE_FROM}, var(--ai-via) 50%, var(--ai-to)`
const EDGE_SWEEP = `${EDGE_FROM}, var(--ai-via), var(--ai-to), var(--ai-via), ${EDGE_FROM}`
const mute = (color) => `color-mix(in oklab, ${color} 45%, var(--line-control))`
const PAD = 'linear-gradient(var(--background), var(--background)) padding-box'

export const AI_RULES = {
  '@utility ai-text': {
    'background-image': 'linear-gradient(115deg, var(--ai-text-from), var(--ai-text-via) 50%, var(--ai-text-to))',
    '-webkit-background-clip': 'text',
    'background-clip': 'text',
    color: 'transparent',
  },
  '@utility ai-edge': {
    border: '1px solid transparent',
    background: `${PAD}, linear-gradient(115deg, ${mute(EDGE_FROM)}, ${mute('var(--ai-via)')} 50%, ${mute('var(--ai-to)')}) border-box`,
    '&:focus-within, &[data-lit]': { background: `${PAD}, linear-gradient(115deg, ${EDGE_STOPS}) border-box` },
  },
  '@utility ai-edge-working': {
    border: '1px solid transparent',
    background: `${PAD}, linear-gradient(90deg, ${EDGE_SWEEP}) border-box`,
    'background-size': '100% 100%, 300% 100%',
    animation: 'ai-sweep 2.4s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', 'background-size': '100% 100%, 100% 100%' },
  },
  '@utility ai-wash': {
    'background-image': 'linear-gradient(180deg, color-mix(in oklab, var(--ai-from) 12%, transparent) 0%, color-mix(in oklab, var(--ai-via) 8%, transparent) 45%, transparent 100%)',
  },
  '@utility ai-glow': {
    'background-image': 'radial-gradient(60% 70% at 30% 40%, color-mix(in oklab, var(--ai-from) 18%, transparent), transparent 70%), radial-gradient(55% 65% at 75% 60%, color-mix(in oklab, var(--ai-to) 18%, transparent), transparent 70%)',
  },
  '@utility ai-line': {
    height: '2px',
    'border-radius': '2px',
    'background-image': `linear-gradient(90deg, ${AI_SWEEP})`,
    'background-size': '300% 100%',
    animation: 'ai-line 1.6s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', 'background-size': '100% 100%' },
  },
  // The fill of a usage bar. The edge's stops, because a 6px bar in raw gold is as faint on paper as a 1.5px edge was.
  // Still on purpose: a meter shows an amount, and motion means "AI is working".
  '@utility ai-meter': {
    'background-image': `linear-gradient(90deg, ${EDGE_STOPS})`,
  },
  '@utility ai-shimmer': {
    'background-image': 'linear-gradient(90deg, var(--muted-foreground), var(--ai-text-via), var(--muted-foreground))',
    'background-size': '200% 100%',
    '-webkit-background-clip': 'text',
    'background-clip': 'text',
    color: 'transparent',
    animation: 'ai-shimmer 2.2s linear infinite',
    '@media (prefers-reduced-motion: reduce)': { animation: 'none', color: 'var(--muted-foreground)', 'background-image': 'none' },
  },
  '@keyframes ai-sweep': { to: { 'background-position': '0 0, -300% 0' } },
  '@keyframes ai-line': { to: { 'background-position': '-300% 0' } },
  '@keyframes ai-shimmer': { to: { 'background-position': '-200% 0' } },
}

// Same rules as CSS text for the theme file and the site stylesheet.
export function renderAiUtilities(rules = AI_RULES) {
  const body = (obj, pad) =>
    Object.entries(obj)
      .map(([k, v]) => (typeof v === 'object' ? `${pad}${k} {\n${body(v, pad + '  ')}\n${pad}}` : `${pad}${k}: ${v};`))
      .join('\n')
  return Object.entries(rules).map(([sel, decl]) => `${sel} {\n${body(decl, '  ')}\n}`).join('\n\n')
}

// Keyboard focus in Windows High Contrast (`forced-colors: active`), WCAG 2.4.7. The browser
// drops every box-shadow in that mode. A stock shadcn field, dropdown or button draws its focus
// ring as a box-shadow (`focus-visible:ring-3`) and removes its outline (`outline-none`), so a
// focused control looked the same as an unfocused one (measured in Chromium: outline-style none).
// Those components are the app's own files, so the fix rides in the theme: in that mode, and only
// in that mode, every focused element gets an outline.
//
// Why this form. `outline-none` sits in Tailwind's `utilities` cascade layer, which beats
// `@layer base` whatever the specificity, so a rule there would lose. CSS outside every layer
// beats all layers, so the rule is emitted at the top level of the theme file and as a top-level
// key of the CLI `css` payload (the CLI writes a top-level `@media` key verbatim, outside any
// layer). That wins without `!important`, and an app can still override it with its own
// unlayered rule. file-channel.test.mjs compiles both channels and checks the rule stays
// unlayered; the Forced colours story checks the computed outline in a browser.
//
// `:focus-visible` on its own, not a list of controls: a list goes stale with the next component.
// `Highlight` is the system colour browsers use for their own focus ring in this mode, and the
// user's theme guarantees it is visible on `Canvas`. Quill's hand-written pieces (`outline-hidden`,
// a transparent 2px outline the mode already paints) get the same single 2px outline, recoloured.
export const FORCED_COLORS_RULES = {
  '@media (forced-colors: active)': {
    ':focus-visible': { outline: '2px solid Highlight', 'outline-offset': '2px' },
    // The one opt-in, and it must stay AFTER the rule above. An outline 2px outside an element is cut off
    // when the element fills a parent that clips: the suggestion scroll area in `ai-popover` (its popup is
    // `overflow-hidden`), a full-width row in a scrolling list (`mail-shell`). Those draw their ring inside
    // themselves with a layered `-outline-offset-*` class, which the unlayered rule above overrides. An
    // element marked `data-focus-inset` gets the same outline drawn inside it instead.
    '[data-focus-inset]:focus-visible': { 'outline-offset': '-2px' },
  },
}

export function renderForcedColors(rules = FORCED_COLORS_RULES) {
  return renderAiUtilities(rules)
}

// The shipped theme file. Until 0.12.0 it carried only variables, because an @theme
// block is inert when the file is imported from a layout — and that was the only
// wiring the docs described. Imported from inside the Tailwind stylesheet
// (`@import "./quill-theme.css"` after `@import "tailwindcss"`) the @theme block and the
// dark variant are honoured, so the file channel gets every Quill utility from one
// import line. The stock `.dark *` stays in the variant for apps that toggle the class.
// scripts/file-channel.test.mjs proves both wirings on the built file.
export function registryBlock(css) {
  return `${darkVariant(MODES, { stockClass: true })}\n\n@theme inline {\n${css.theme}\n}\n\n:root {\n${css.root}\n}\n\n${modeBlocks(css)}\n\n${renderAiUtilities()}\n\n${renderForcedColors()}`
}

// --- shadcn registry payload (the channel that actually reaches an app) ---
//
// A Tailwind v4 `@theme` block only produces utilities when it sits in the SAME
// stylesheet as `@import "tailwindcss"`. The theme file we ship is imported
// separately from the consumer's layout.tsx, so an `@theme` block inside it is
// inert — verified in a clean Next 16 + Tailwind v4 app, three wirings.
//
// shadcn's own delivery channel does not have that problem: the CLI merges
// `cssVars` and `css` into the app's MAIN stylesheet. `cssVars.theme` IS the
// `@theme` block. `cssVars` has only three buckets though (theme/light/dark) and
// Quill has five [data-theme] modes and four [data-accent] blocks, so those ride
// in `css`, which takes arbitrary selectors.
//
// Spec item W19 / decision D8. Verified end-to-end: installed into a scaffolded
// app with the real CLI, `font-heading`, `text-2xs` and every pigment compile.
// Two key shapes, and the difference is load-bearing. `cssVars` keys are
// written BARE (`paper`) because the CLI prepends `--` when it merges them into
// `:root` / `@theme`. `css` keys are literal property names the CLI writes
// verbatim, so they must carry the `--` themselves — with bare keys the CLI
// emitted `paper: var(--dk-paper);` inside every [data-theme] and [data-accent]
// block, which browsers drop, so a CLI-installed app could not switch theme or
// accent through the merged CSS (verified with the real CLI, 2026-09-14).
function decls(block, { keepPrefix = false } = {}) {
  return Object.fromEntries(
    block
      .split('\n')
      // `_` too: `--space-2_5`. Without it the three half-steps never reached a CLI-installed app.
      .map((l) => l.match(/^\s*--([a-z0-9_-]+)\s*:\s*(.+);\s*$/))
      .filter(Boolean)
      .map((m) => [keepPrefix ? `--${m[1]}` : m[1], m[2]]),
  )
}

// A third shape rule, learned the same way (real CLI, scratch app, 2026-09-21): the
// CLI registers every COLOUR in `cssVars.light` as a `--color-*` theme key. With all
// of :root there, an app got 271 classes nobody asked for (`bg-dk-paper`,
// `bg-cd-indigo-deep`, `bg-int-ink`) in the stylesheet its agents read. So
// `cssVars.light` carries only the contract roles — the keys the CLI is built to
// map, and the same ones `cssVars.theme` already asks for — and every other :root
// declaration rides in `css[':root']`, written verbatim with nothing registered.
// library-sync's merged-layer detection reads that block for the same reason.
export function registryPayload(css, t = tokens) {
  const literal = { keepPrefix: true }
  const contract = new Set([...Object.keys(t.semantic), 'radius'])
  const root = Object.entries(decls(css.root))
  return {
    cssVars: { theme: decls(css.theme), light: Object.fromEntries(root.filter(([k]) => contract.has(k))) },
    css: Object.fromEntries([
      [darkVariant(MODES, { stockClass: true }).replace(/;$/, ''), {}],
      [':root', Object.fromEntries(root.filter(([k]) => !contract.has(k)).map(([k, v]) => [`--${k}`, v]))],
      ...css.modes.map((m) => [`[data-theme="${m.attr}"]`, decls(m.body, literal)]),
      ...css.accents.map((a) => [`[data-accent="${a.name}"]`, decls(a.body, literal)]),
      ...Object.entries(AI_RULES),
      ...Object.entries(FORCED_COLORS_RULES),
    ]),
  }
}

export function renderManager(t) {
  const L = (mv) => mv.light
  return {
    appBg: L(t.color.paper.base), appContentBg: L(t.color.paper.base), appPreviewBg: L(t.color.paper.base),
    barBg: L(t.color.paper.warm), inputBg: L(t.color.paper.warm),
    inputBorder: L(t.color.line.control),
    barSelectedColor: L(t.color.pigment.terracotta.base),
    colorPrimary: L(t.color.pigment.terracotta.base), colorSecondary: L(t.color.pigment.terracotta.base),
    textColor: L(t.color.ink.base), inputTextColor: L(t.color.ink.base),
    textMutedColor: L(t.color.ink.muted), barTextColor: L(t.color.ink.soft),
    barHoverColor: L(t.color.ink.base), textInverseColor: L(t.color.paper.base),
    appBorderColor: L(t.color.line.soft), appBorderRadius: 8, inputBorderRadius: 6,
  }
}

// --- main (not exercised by unit tests) ---
function globalsBlock(css) {
  return `${darkVariant()}\n\n@theme inline {\n${css.theme}\n}\n\n:root {\n${css.root}\n}\n\n${modeBlocks(css)}\n\n${renderAiUtilities()}\n\n${renderForcedColors()}`
}

export function main() {
  const css = renderCss(tokens)
  const globalsPath = join(root, 'src/app/globals.css')
  writeFileSync(globalsPath, injectMarkers(readFileSync(globalsPath, 'utf8'), globalsBlock(css)))
  const regPath = join(root, 'registry/themes/quill.css')
  writeFileSync(regPath, injectMarkers(readFileSync(regPath, 'utf8'), registryBlock(css)))
  mkdirSync(join(root, 'src/tokens/generated'), { recursive: true })
  writeFileSync(
    join(root, 'src/tokens/generated/manager-theme.mjs'),
    `// GENERATED by scripts/build-tokens.mjs — do not edit.\nexport const managerTheme = ${JSON.stringify(renderManager(tokens), null, 2)}\n`,
  )

  // The `quill` registry item carries the token layer through shadcn's own
  // channel. registry.json is committed and partly generated (build-usage writes
  // docs/description the same way); no trailing newline, matching that writer.
  const registryPath = join(root, 'registry.json')
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const base = registry.items.find((i) => i.name === 'quill')
  if (!base) throw new Error('registry.json has no `quill` base item to attach the token payload to')
  Object.assign(base, registryPayload(css))
  writeFileSync(registryPath, JSON.stringify(registry, null, 2))
}

if (isMain(import.meta.url)) main()
