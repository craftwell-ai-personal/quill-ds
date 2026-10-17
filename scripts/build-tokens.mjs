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

// A scale key as it appears in a variable name: `2.5` → `2_5` (dots are illegal there).
const varKey = (k) => String(k).replace(/\./g, '_')

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
  // The size scales — spacing, border width, radius, type — hold their values here, in
  // :root, and the @theme block below points each Tailwind utility at them. So an
  // inspected `p-4` reads `padding: var(--space-4)`, not Tailwind's
  // `calc(var(--spacing) * 4)`, and `rounded-md` reads `var(--radius-md)`, not `0.375rem`.
  // Dots are illegal in CSS custom-property names — a half-step key like "2.5"
  // must emit `--space-2_5`, or a strict minifier (LightningCSS, used by the
  // production build + downstream consumers) throws and drops the whole :root block.
  for (const [k, v] of Object.entries(t.spacing)) rootLines.push(`  --space-${varKey(k)}: ${v};`)
  for (const [k, v] of Object.entries(t.borderWidth)) rootLines.push(`  --border-width-${k}: ${v};`)
  for (const [k, v] of Object.entries(t.radius)) rootLines.push(`  --radius-${k}: ${v};`)
  for (const [k, v] of Object.entries({ ...t.size.width, ...t.size.height })) rootLines.push(`  --size-${k}: ${v};`)
  for (const [k, v] of Object.entries(t.text)) {
    rootLines.push(`  --text-${k}: ${v};`)
    if (t.textLeading[k]) rootLines.push(`  --text-${k}--line-height: ${t.textLeading[k]};`)
  }
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
  // Every size utility points at the :root scale above. `@theme inline` writes the
  // value into the utility, and the value is the Quill variable, so the variable is
  // what the inspector shows. (A self-reference like `--radius-md: var(--radius-md)` is
  // fine here: an inline theme key is never emitted as a variable, so nothing cycles.)
  // A named key beats Tailwind's multiplier: `p-4` reads `--spacing-4`, and only a step
  // Quill does not have (`p-13`) still falls back to `calc(var(--spacing) * 13)`.
  // Measured with Tailwind 4.3.3, 2026-10-16.
  for (const k of Object.keys(t.spacing)) themeLines.push(`  --spacing-${varKey(k)}: var(--space-${varKey(k)});`)
  for (const k of Object.keys(t.radius)) themeLines.push(`  --radius-${k}: var(--radius-${k});`)
  // Widths ride Tailwind's container family, which feeds w-, max-w-, min-w- and basis- only
  // (`w-card` → `width: var(--size-card)`). Heights have no family of their own, so they ride
  // the spacing one (h-, min-h-, max-h-, size-); that also makes `p-frame` compile, which
  // quill-check flags. Measured with Tailwind 4.3.3, 2026-10-17.
  for (const k of Object.keys(t.size.width)) themeLines.push(`  --container-${k}: var(--size-${k});`)
  for (const k of Object.keys(t.size.height)) themeLines.push(`  --spacing-${k}: var(--size-${k});`)
  // Tailwind's own key for a size's line height (`--text-sm--line-height`), so the
  // `text-*` utilities pick it up with no new class to learn.
  for (const k of Object.keys(t.text)) {
    themeLines.push(`  --text-${k}: var(--text-${k});`)
    if (t.textLeading[k]) themeLines.push(`  --text-${k}--line-height: var(--text-${k}--line-height);`)
  }
  // Border, ring and outline widths, their bare forms (`border` is 1px, as Tailwind's is),
  // and the ring and outline offsets. The offsets take the width tokens, not the space
  // ones: both are pixels in Tailwind, and a rem step would drift in an app that changes
  // its root font size. A bare integer Tailwind does not know (`border-13`) still compiles
  // to 13px whatever the theme says; quill-check flags it.
  for (const ns of ['border-width', 'ring-width', 'outline-width', 'ring-offset-width', 'outline-offset']) {
    for (const k of Object.keys(t.borderWidth)) themeLines.push(`  --${ns}-${k}: var(--border-width-${k});`)
  }
  for (const ns of ['border-width', 'ring-width', 'outline-width']) themeLines.push(`  --default-${ns}: var(--border-width-1);`)
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
    border: 'var(--border-width-1) solid transparent',
    background: `${PAD}, linear-gradient(115deg, ${mute(EDGE_FROM)}, ${mute('var(--ai-via)')} 50%, ${mute('var(--ai-to)')}) border-box`,
    '&:focus-within, &[data-lit]': { background: `${PAD}, linear-gradient(115deg, ${EDGE_STOPS}) border-box` },
  },
  '@utility ai-edge-working': {
    border: 'var(--border-width-1) solid transparent',
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
    height: 'var(--border-width-2)',
    'border-radius': 'var(--radius-xs)',
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
    ':focus-visible': { outline: 'var(--border-width-2) solid Highlight', 'outline-offset': 'var(--border-width-2)' },
    // The one opt-in, and it must stay AFTER the rule above. An outline 2px outside an element is cut off
    // when the element fills a parent that clips: the suggestion scroll area in `ai-popover` (its popup is
    // `overflow-hidden`), a full-width row in a scrolling list (`mail-shell`). Those draw their ring inside
    // themselves with a layered `-outline-offset-*` class, which the unlayered rule above overrides. An
    // element marked `data-focus-inset` gets the same outline drawn inside it instead.
    '[data-focus-inset]:focus-visible': { 'outline-offset': 'calc(var(--border-width-2) * -1)' },
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
