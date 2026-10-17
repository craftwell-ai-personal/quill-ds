/**
 * Quill's tokens, as Paper tokens.
 *
 * Read from the SHIPPED theme (registry/themes/quill.css), not from the token source: the
 * point is that HTML written into Paper can say `var(--card)` exactly as an app's CSS does,
 * so the names must be the ones an app receives. The theme is generated from
 * src/tokens/quill.tokens.mjs and CI diffs it, so it cannot drift from the source.
 *
 * Decisions (the spike report explains each):
 * - Names follow Tailwind v4's namespaces, the convention the owner's other Paper library
 *   ("Mantis Design System") uses and the one Paper's own token guide asks for:
 *     colour        --color-<name>      the theme's `@theme` block defines these for the
 *                                       contract, status and pigment colours, so they are real
 *                                       names in an app; the chart, line and AI colours have no
 *                                       `--color-` name in the theme and get one here (`source`
 *                                       keeps the name the CSS uses)
 *     spacing       --spacing-<step>    the theme calls these `--space-<step>`
 *     line height   --leading-text-sm   the theme's `--text-sm--line-height`: Paper collapses a
 *                                       double dash, and `--text-*` is the font-size namespace
 *     everything else (`--radius-lg`, `--text-sm`, `--font-sans`, `--leading-ui`,
 *     `--tracking-label`) already has its namespaced name in the theme
 * - Font weights are not Quill tokens. The three the shipped theme loads Raleway in
 *   (400, 500, 600) are pushed as `--font-weight-*` so type can bind a weight, as Mantis does.
 * - Values are Dawn's. Paper tokens hold one value each, so the four other themes'
 *   prefixed copies (`--dk-*`, `--cl-*`, `--cd-*`, `--int-*`) are not pushed.
 * - Aliases stay aliases (`--color-card: var(--color-paper-warm)`): Paper follows them.
 * - Sizes go in as px (the theme writes rem), line heights as plain ratios.
 * - A font token holds one family name. Paper accepts a CSS fallback stack as a value and
 *   then renders the system font, so only the first family of each stack is pushed.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tokens as source } from '../../src/tokens/quill.tokens.mjs'
import { MODES } from '../../src/tokens/themes.mjs'
import { parseColor, sameColor } from './color.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
export const THEME_PATH = join(root, 'registry/themes/quill.css')
const ROOT_FONT_PX = 16

// ------------------------------------------------------------------ reading the theme

const declarations = (block) => [...block.matchAll(/^\s*(--[\w-]+)\s*:\s*([^;]+);/gm)].map((match) => [match[1], match[2].trim()])
const blockAfter = (css, opener) => {
  const start = css.indexOf(opener)
  if (start < 0) return ''
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start))
}

/** The custom properties an app gets in Dawn: the `@theme` block, then `:root` (which wins a duplicate). */
export function themeDeclarations(css) {
  const theme = declarations(blockAfter(css, '@theme inline'))
  const rootBlock = declarations(blockAfter(css, '\n:root'))
  const modePrefixes = MODES.map((mode) => `--${mode.prefix}-`)
  const merged = new Map()
  for (const [name, value] of [...theme, ...rootBlock]) {
    if (modePrefixes.some((prefix) => name.startsWith(prefix))) continue
    merged.set(name, value)
  }
  return merged
}

/** The `@utility` names in the theme: gradients, glows and motion that are CSS rules, not values. */
export const themeUtilities = (css) => [...css.matchAll(/^@utility\s+([\w-]+)/gm)].map((match) => match[1])

// ------------------------------------------------------------------ mapping

const px = (value) => {
  const match = value.match(/^(-?[\d.]+)(rem|px)$/)
  if (!match) return null
  const pixels = match[2] === 'rem' ? parseFloat(match[1]) * ROOT_FONT_PX : parseFloat(match[1])
  return `${Math.round(pixels * 1000) / 1000}px`
}

/** `calc(1.25 / 0.875)` or `1.5` → a plain ratio. Paper stores a line height as one number. */
export function ratio(value) {
  const division = value.match(/^calc\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)$/)
  const result = division ? parseFloat(division[1]) / parseFloat(division[2]) : /^[\d.]+$/.test(value) ? parseFloat(value) : NaN
  return Number.isFinite(result) ? Math.round(result * 1e6) / 1e6 : null
}

const NOT_REPRESENTABLE = [
  [/^--shadow/, 'shadow: Paper has no shadow token type; shadows are written as literal box-shadow values'],
  [/^--(ease|dur|lift)/, 'motion: Paper has no easing, duration or transform token type (and a still frame has no motion)'],
  [/^--fraunces-/, 'font-variation-settings preset: no Paper type; written as a literal on each heading'],
  [/^--border-width-/, 'border width: no Paper type; it would sit among the spacing tokens and be offered for padding and gap'],
  [/^--size-/, 'width or height: no Paper type; it would sit among the spacing tokens and be offered for padding and gap'],
  // Tailwind's keys for the ring/outline widths, offsets and bare-`border` default, each pointing at a border width
  [/^--(default-)?(ring|outline)-(offset-)?width|^--outline-offset-|^--default-border-width$/, 'border width: no Paper type (these point the ring, outline and bare-border utilities at --border-width-*)'],
]

export const firstFamily = (stack) => stack.split(',')[0].replace(/["']/g, '').trim()

const aliasTarget = (value) => value.match(/^var\((--[\w-]+)\)$/)?.[1] ?? null

/** Follow `var(--x)` chains to the literal at the end. */
export function resolveValue(name, values, seen = new Set()) {
  const value = values.get(name)
  const target = value === undefined ? null : aliasTarget(value)
  if (!target) return value
  if (seen.has(target)) return undefined
  return resolveValue(target, values, seen.add(target))
}

const WEIGHT_NAMES = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'normal', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' }

/** The weights the theme's font import loads the body face in: the only weights an app can render. */
export function loadedWeights(css, family = 'Raleway') {
  const listed = css.match(new RegExp(`family=${family}:wght@([\\d;]+)`))?.[1]
  return listed ? listed.split(';').map(Number).filter((weight) => WEIGHT_NAMES[weight]) : []
}

/** The name a theme property takes in Paper (see the header for why each differs). */
export function paperName(name, type) {
  if (type === 'color') return name.startsWith('--color-') ? name : `--color-${name.slice(2)}`
  if (type === 'spacing') return name.replace(/^--space-/, '--spacing-')
  if (type === 'lineHeight') return name.replace(/^--text-(\w+)--line-height$/, '--leading-text-$1')
  return name
}

/**
 * Sort the theme's properties into Paper tokens and the ones Paper cannot hold.
 * Returns `{ tokens: [{ name, type, value, source }], skipped: [{ name, reason }] }`;
 * `source` is the property's name in the shipped CSS.
 */
export function mapTokens(values, { weights = [] } = {}) {
  const tokens = []
  const skipped = []
  const typed = new Map()
  const add = (source, type, value) => { tokens.push({ name: paperName(source, type), type, value, source }); typed.set(source, type) }

  // First pass: everything that is a value. Aliases wait until their target's type is known.
  const aliases = []
  for (const [name, value] of values) {
    const blocked = NOT_REPRESENTABLE.find(([pattern]) => pattern.test(name))
    if (blocked) { skipped.push({ name, reason: blocked[1] }); continue }
    // `--color-card: var(--card)` in the theme IS the token pushed as --color-card; a second copy would shadow it
    if (name.startsWith('--color-')) continue
    // `--spacing-4: var(--space-4)` is the theme pointing Tailwind's `p-4` at the Quill step, which Paper
    // already gets as --spacing-4 (from --space-4); a second copy would be the same name aliased to itself
    if (/^--spacing-/.test(name) && value === `var(${name.replace('--spacing-', '--space-')})`) continue
    if (aliasTarget(value)) { aliases.push([name, value]); continue }
    // One family, no fallback stack: given `"Raleway", -apple-system, …` Paper accepts the token and then
    // draws the system font (verified). The first name is the face the design means.
    if (name.startsWith('--font-')) add(name, 'fontFamily', firstFamily(value))
    else if (name === '--radius' || name.startsWith('--radius-')) add(name, 'radius', px(value) ?? value)
    else if (name.startsWith('--space-')) add(name, 'spacing', px(value) ?? value)
    else if (/^--text-\w+--line-height$/.test(name)) add(name, 'lineHeight', ratio(value))
    else if (name.startsWith('--text-')) add(name, 'fontSize', px(value) ?? value)
    else if (name.startsWith('--leading-')) add(name, 'lineHeight', ratio(value))
    else if (name.startsWith('--tracking-')) add(name, 'letterSpacing', value)
    else if (parseColor(value)) add(name, 'color', value)
    else skipped.push({ name, reason: `no Paper token type holds "${value}"` })
  }
  // Second pass: an alias takes the type of what it points at, however long the chain,
  // and points at that token's Paper name.
  let waiting = aliases
  while (waiting.length) {
    const next = []
    for (const [name, value] of waiting) {
      const target = aliasTarget(value)
      const type = typed.get(target)
      if (type) add(name, type, `var(${paperName(target, type)})`)
      else next.push([name, value])
    }
    if (next.length === waiting.length) {
      for (const [name, value] of next) skipped.push({ name, reason: `alias of ${aliasTarget(value)}, which is not a Paper token` })
      break
    }
    waiting = next
  }
  for (const weight of weights) tokens.push({ name: `--font-weight-${WEIGHT_NAMES[weight]}`, type: 'fontWeight', value: weight, source: null })
  // which colour names an app really has: the rest exist under this name only in Paper
  for (const token of tokens) if (token.type === 'color') token.inTheme = values.has(token.name)
  return { tokens: orderTokens(tokens), skipped }
}

const TYPE_ORDER = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'spacing', 'radius']

/**
 * Paper shows tokens in creation order and asks for semantic colours before the palette and
 * sizes smallest first. Paper refuses an alias whose target does not exist yet, so the sync
 * creates each alias with its end value and turns it into an alias in a second step: that
 * is what lets the contract roles lead the list.
 */
export function orderTokens(tokens) {
  const size = (token) => parseFloat(token.value)
  const isAlias = (token) => typeof token.value === 'string' && token.value.startsWith('var(')
  // the 31-role contract leads, then the other roles (status, accent), then the palette they point at
  const colorRank = (token) => (token.name.replace('--color-', '') in source.semantic ? 0 : isAlias(token) ? 1 : 2)
  return [...tokens].sort((first, second) => {
    const byType = TYPE_ORDER.indexOf(first.type) - TYPE_ORDER.indexOf(second.type)
    if (byType) return byType
    if (first.type === 'color') return colorRank(first) - colorRank(second)
    if (first.type === 'fontFamily') return 0
    const bySize = size(first) - size(second)
    return Number.isFinite(bySize) ? bySize : 0
  })
}

/** The whole mapping for the checked-in theme. */
export function quillPaperTokens(css = readFileSync(THEME_PATH, 'utf8')) {
  const values = themeDeclarations(css)
  const mapped = mapTokens(values, { weights: loadedWeights(css) })
  const utilities = themeUtilities(css).map((name) => ({ name, reason: 'a CSS utility (gradient, glow or animation rule), not a value; its rendered result is written per node' }))
  return { ...mapped, skipped: [...mapped.skipped, ...utilities] }
}

export const payloadHash = (tokens) => createHash('sha256').update(JSON.stringify(tokens.map(({ name, type, value }) => [name, type, value]))).digest('hex').slice(0, 16)

// ------------------------------------------------------------------ comparing with what Paper holds

const unquote = (value) => String(value).replace(/["']/g, '').replace(/\s*,\s*/g, ', ').trim()
const asRatio = (value) => (typeof value === 'number' ? value : String(value).endsWith('%') ? parseFloat(value) / 100 : ratio(String(value)))

/** Paper rewrites what it is given (`rgba(…)` → `rgb(… / 12%)`, `1.5` → `150%`), so compare meanings, not strings. */
export function sameTokenValue(type, ours, theirs) {
  if (String(ours) === String(theirs)) return true
  if (String(ours).startsWith('var(') || String(theirs).startsWith('var(')) return false
  if (type === 'color') return sameColor(parseColor(String(ours)), parseColor(String(theirs)), 0.51)
  if (type === 'lineHeight') return Math.abs(asRatio(ours) - asRatio(theirs)) < 1e-4
  if (type === 'fontFamily') return unquote(ours) === unquote(theirs)
  if (type === 'fontWeight') return Number(ours) === Number(theirs)
  const [a, b] = [px(String(ours)), px(String(theirs))]
  return a !== null && a === b
}

/** What a sync has to do: create the missing, update the changed, and name what Paper has that Quill does not. */
export function planTokenSync(wanted, existing) {
  const have = new Map(existing.map((token) => [token.name, token]))
  const want = new Set(wanted.map((token) => token.name))
  const plan = { create: [], update: [], retype: [], unchanged: [], extra: existing.filter((token) => !want.has(token.name)).map((token) => token.name) }
  for (const token of wanted) {
    const current = have.get(token.name)
    if (!current) plan.create.push(token)
    else if (current.type !== token.type) plan.retype.push(token)
    else if (!sameTokenValue(token.type, token.value, current.value)) plan.update.push(token)
    else plan.unchanged.push(token.name)
  }
  return plan
}

// ------------------------------------------------------------------ a resolved table, for binding and for checks

/**
 * Tokens with their end values worked out, in the shape the converter and the checker read:
 * colours as `{ r, g, b, a }`, sizes in px, line heights as ratios, tracking in em.
 */
export function resolveTokens(tokens) {
  const byName = new Map(tokens.map((token) => [token.name, String(token.value)]))
  return tokens.map((token, order) => {
    const literal = resolveValue(token.name, byName)
    const entry = { name: token.name, type: token.type, order, alias: String(token.value).startsWith('var('), literal }
    if (token.type === 'color') entry.color = parseColor(literal ?? '')
    else if (token.type === 'lineHeight') entry.ratio = asRatio(literal)
    else if (token.type === 'letterSpacing') entry.em = parseFloat(literal)
    else if (token.type === 'fontFamily') entry.family = unquote(literal ?? '').split(',')[0].trim()
    else if (token.type === 'fontWeight') entry.weight = Number(literal)
    else entry.px = parseFloat(px(literal ?? '') ?? 'NaN')
    return entry
  })
}
