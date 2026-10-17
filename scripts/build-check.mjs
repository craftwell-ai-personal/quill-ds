/**
 * Generates registry/check/quill-check.mjs — the `@quill/check` item, a self-check an
 * agent runs inside its app. The script body is scripts/check/quill-check.template.mjs;
 * everything it knows about Quill (utility names, token values, retired names, role
 * intents, the palette fix table) is derived here from the token source and roles.mjs,
 * so the check can never disagree with the system it enforces. Same single-source rule
 * as agent-rules and llms.txt. scripts/quill-check.test.mjs fails CI when the file is stale.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { tokens } from '../src/tokens/quill.tokens.mjs'
import { renderCss } from './build-tokens.mjs'
import { ROLE_INTENTS, STATUS_INTENTS } from '../src/usage/roles.mjs'
import { SIZE_JOBS } from '../src/usage/sizes.mjs'
import { isMain } from './lib/is-main.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CHECK_PATH = join(root, 'registry/check/quill-check.mjs')
const TEMPLATE_PATH = join(root, 'scripts/check/quill-check.template.mjs')

// Utility prefixes the check reads. Colour prefixes first (rules 2/3/4), then the token
// namespaces Quill owns (rule 4). The spacing, size and border-width utilities are read by
// their own patterns in the template (rule 6), because their first word (`p`, `w`, `top`) is
// too common in prose to accept on its own: they need a value after the dash.
export const COLOR_PREFIXES = ['bg', 'text', 'border', 'ring', 'outline', 'fill', 'stroke', 'from', 'to', 'via', 'decoration', 'divide', 'placeholder', 'caret', 'accent', 'shadow']
export const PREFIXES = [...COLOR_PREFIXES, 'font', 'rounded', 'leading', 'tracking', 'ease', 'duration']

// Stock Tailwind hue → the Quill roles that do that job, per utility family. An empty
// list means "no Quill pigment sits here — pick a role by job".
export const PALETTE = {
  bg: { white: ['background', 'card'], black: ['foreground'], grey: ['muted', 'secondary'], red: ['destructive'], green: ['moss'], blue: ['indigo', 'info'], yellow: ['gold', 'warning'], purple: [] },
  text: { white: ['primary-foreground', 'card'], black: ['foreground'], grey: ['muted-foreground', 'foreground'], red: ['destructive'], green: ['success'], blue: ['info', 'link'], yellow: ['warning'], purple: [] },
  border: { white: ['border'], black: ['foreground'], grey: ['border', 'input', 'ring'], red: ['destructive'], green: ['moss'], blue: ['indigo'], yellow: ['gold'], purple: [] },
}

// The versions that retired each name and then dropped it from the CSS — the token source
// says WHAT is retired; the fix text should also say WHEN, so an agent can judge how old
// the code it is reading is, and that the name now resolves to nothing.
const RETIRED_CLASSES = { 'indigo-brand': { use: 'indigo', since: '0.9.60', removed: '0.13.0' }, 'indigo-brand-deep': { use: 'indigo-deep', since: '0.9.60', removed: '0.13.0' } }
const RETIRED_VARS_SINCE = '0.10.0'
const RETIRED_VARS_REMOVED = '0.13.0'

const px = (v) => (v.endsWith('rem') ? Math.round(parseFloat(v) * 16 * 100) / 100 : parseFloat(v))
const ms = (v) => Math.round(parseFloat(v) * (v.endsWith('ms') ? 1 : 1000))
const firstSentence = (s) => {
  const m = s.match(/^[^.]*\./)
  const t = (m ? m[0] : s).trim()
  return t.length > 110 ? t.slice(0, 107).replace(/\s+\S*$/, '') + '…' : t
}

export function checkData(t = tokens) {
  const { theme, root: rootBlock } = renderCss(t)
  const themeKeys = [...theme.matchAll(/^\s*--([a-z0-9-]+?)(--[a-z-]+)?:\s*(.+);/gm)].filter((m) => !m[2]).map((m) => [m[1], m[3]])
  const names = (prefix) => themeKeys.filter(([k]) => k.startsWith(prefix)).map(([k]) => k.slice(prefix.length))
  const colours = names('color-')
  const fonts = names('font-')
  const sizes = names('text-')
  const radii = names('radius-')
  const shadows = names('shadow-')
  const leadings = names('leading-')
  const trackings = names('tracking-')
  const quillClasses = [
    ...colours.flatMap((c) => COLOR_PREFIXES.map((p) => `${p}-${c}`)),
    ...fonts.map((f) => `font-${f}`),
    ...sizes.map((s) => `text-${s}`),
    ...radii.map((r) => `rounded-${r}`),
    ...shadows.map((s) => `shadow-${s}`),
    ...leadings.map((l) => `leading-${l}`),
    ...trackings.map((x) => `tracking-${x}`),
    ...Object.keys(t.size.width).flatMap((k) => ['w', 'max-w', 'min-w', 'basis'].map((p) => `${p}-${k}`)),
    ...Object.keys(t.size.height).flatMap((k) => ['h', 'max-h', 'min-h', 'size'].map((p) => `${p}-${k}`)),
  ]
  // `--color-X: var(--Y)` → a bracketed `text-[var(--Y)]` already has the utility `text-X`.
  const vars = Object.fromEntries(
    themeKeys.filter(([k, v]) => k.startsWith('color-') && /^var\(--[a-z0-9-]+\)$/.test(v)).map(([k, v]) => [v.slice(4, -1), k.slice(6)]),
  )
  // Dawn hex per role / pigment, for "nearest Quill colour" hints on a raw hex. Hex leaves only.
  const rootVals = Object.fromEntries([...rootBlock.matchAll(/^\s*--([a-z0-9-]+):\s*(.+);/gm)].map((m) => [m[1], m[2]]))
  const resolveHex = (name, depth = 0) => {
    const v = rootVals[name]
    if (!v || depth > 6) return null
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase()
    const r = v.match(/^var\(--([a-z0-9-]+)\)$/)
    return r ? resolveHex(r[1], depth + 1) : null
  }
  const swatches = Object.fromEntries(colours.map((c) => [c, resolveHex(c)]).filter(([, h]) => h))
  const roles = Object.fromEntries(Object.entries({ ...ROLE_INTENTS, ...STATUS_INTENTS }).map(([k, v]) => [k, firstSentence(v.use)]))
  // Motion ships as variables only (no duration-*/ease-* utilities), so the fix for a
  // bracketed value is Tailwind's variable shorthand: duration-(--dur-fast).
  const motion = {
    duration: Object.fromEntries(Object.entries(t.motion).filter(([k]) => k.startsWith('dur')).map(([k, v]) => [`--${k === 'dur' ? 'dur' : k.replace(/^dur/, 'dur-').toLowerCase()}`, ms(v)])),
    ease: Object.keys(t.motion).filter((k) => k.startsWith('ease')).map((k) => `--${k.replace(/^ease/, 'ease-').toLowerCase()}`),
  }
  return {
    version: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version,
    prefixes: PREFIXES,
    quillClasses,
    vars,
    tokens: {
      // the steps as utilities name them (`0.5`, not the variable's `0_5`), in px
      space: Object.fromEntries(Object.entries(t.spacing).map(([k, v]) => [k, px(v)]).sort((a, b) => a[1] - b[1])),
      borderWidth: Object.fromEntries(Object.entries(t.borderWidth).map(([k, v]) => [k, px(v)])),
      size: Object.fromEntries(['width', 'height'].map((g) => [g, Object.fromEntries(Object.entries(t.size[g]).map(([k, v]) => [k, px(v)]))])),
      sizeJobs: SIZE_JOBS,
      text: Object.fromEntries(Object.entries(t.text).map(([k, v]) => [k, px(v)])),
      radius: Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [k, px(v)])),
      radiusBase: px(t.radiusBase),
      tracking: Object.fromEntries(Object.entries(t.tracking).map(([k, v]) => [k, parseFloat(v)])),
      leading: Object.fromEntries(Object.entries(t.leading).map(([k, v]) => [k, parseFloat(v)])),
      shadow: shadows,
      motion,
    },
    retired: {
      classes: RETIRED_CLASSES,
      vars: Object.fromEntries(Object.keys(t.retired).map((k) => [`--${k}`, { aliases: t.retired[k], since: RETIRED_VARS_SINCE, removed: RETIRED_VARS_REMOVED }])),
    },
    roles,
    palette: PALETTE,
    swatches,
  }
}

export function renderCheck() {
  const template = readFileSync(TEMPLATE_PATH, 'utf8')
  if (!template.includes('/*__DATA__*/ null')) throw new Error('template lost its /*__DATA__*/ null placeholder')
  return template.replace('/*__DATA__*/ null', JSON.stringify(checkData(), null, 1))
}

if (isMain(import.meta.url)) {
  mkdirSync(dirname(CHECK_PATH), { recursive: true })
  writeFileSync(CHECK_PATH, renderCheck())
  console.log('wrote registry/check/quill-check.mjs')
}
