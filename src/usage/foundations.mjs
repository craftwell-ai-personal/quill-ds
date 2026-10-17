/**
 * Foundations and principles, rendered from the token source.
 *
 * One renderer feeds three outputs — the generated spans in DESIGN.md, the
 * Foundations and Principles sections of public/llms.txt, and the agent-rules
 * file apps install — so a size, radius or shadow name can never drift from
 * src/tokens/quill.tokens.mjs. The hand-written prose this replaces named a
 * type size, four layout tokens and a whole leading/tracking scale that never
 * shipped, and said hover and accent italics were terracotta when the accent
 * axis owns them (spec F16). Only rules that transfer to an app built with
 * Quill belong here; Quill's own product identity (PRODUCT.md) does not.
 *
 * Every `--token` written here is checked against the shipped theme by
 * scripts/token-truth.test.mjs. A name that does not ship fails CI.
 */
import { SIZE_JOBS } from './sizes.mjs'
import { tokens } from '../tokens/quill.tokens.mjs'
import { DEFAULT_ACCENT } from '../tokens/themes.mjs'

const px = (rem) => `${Math.round(parseFloat(rem) * 160) / 10}px`
// `calc(1.25 / 0.875)` or a bare number → the ratio.
const ratio = (css) => { const m = css.match(/^calc\(([\d.]+)\s*\/\s*([\d.]+)\)$/); return m ? m[1] / m[2] : Number(css) }
// The line a `text-*` class sets along with its size; `2xs` has none and inherits.
const line = (t, k) => (t.textLeading[k] ? `${Math.round(ratio(t.textLeading[k]) * 1000) / 10}% (${Math.round(ratio(t.textLeading[k]) * parseFloat(t.text[k]) * 160) / 10}px)` : 'inherits')

const TEXT_USE = {
  '2xs': 'micro labels, tag pills',
  xs: 'meta, eyebrows',
  sm: 'captions, fine print',
  base: 'UI text, buttons',
  lg: 'lead paragraphs',
  xl: 'card titles',
  '2xl': 'sub-headings',
  '3xl': 'section titles',
  '4xl': 'page heads',
  '5xl': 'hero display',
}

const LEADING_USE = { display: 'hero and h1 lines', heading: 'h2–h6', ui: 'controls and dense UI text', reading: 'body and long-form copy' }
const TRACKING_USE = { display: 'Fraunces headings', label: 'small uppercase labels and badges', eyebrow: 'eyebrows above a headline' }

export function renderTypeSection(t = tokens) {
  const L = []
  L.push('Two voices. **Fraunces** (variable display serif) is the brand voice; **Raleway** does the work.')
  L.push('')
  L.push('### Families')
  L.push(`- \`--font-display\`: \`${t.font.display}\` — headings, wordmark, captions. \`--font-heading\` is the same face, behind the \`font-heading\` utility.`)
  L.push(`- \`--font-sans\`: \`${t.font.sans}\` — body, UI, labels.`)
  L.push(`- \`--font-mono\`: \`${t.font.mono}\` — code and token specimens.`)
  L.push(`- \`--font-ui\` / \`--font-data\` — the Intelligent theme's instrument faces (\`${t.font.ui.split(',')[0]}\`, \`${t.font.data.split(',')[0]}\`); leave them to that theme.`)
  L.push('')
  L.push('Loaded from Google Fonts by the `@import` at the top of the shipped theme file. Never load the families again under another name: the theme matches them by their literal names. Weights used: **400 / 500 / 600**.')
  L.push('')
  L.push('### Fraunces variable axes')
  L.push('- `opsz` 9–144 matches optical size to render size · `SOFT` 0–100 rounds terminals as size grows · `WONK` 0 | 1 is the off-kilter glyph set, **accents only**.')
  L.push(`- Presets: \`--fraunces-display\` (\`${t.fraunces.display}\`) · \`--fraunces-accent\` (\`${t.fraunces.accent}\`, the italic emphasis) · \`--fraunces-text\` (\`${t.fraunces.text}\`) · \`--fraunces-caption\` (\`${t.fraunces.caption}\`).`)
  L.push('- Every Fraunces text is soft: `h2`–`h6` and `font-heading` text take `--fraunces-text` (optical size follows the render size), `h1` takes `--fraunces-display`, `.fraunces-accent` / `.fraunces-caption` are the exceptions. The base layer applies all of it.')
  L.push('')
  L.push('### Type scale')
  L.push('| Token | Size | Line | Use |')
  L.push('|---|---|---|---|')
  for (const [k, v] of Object.entries(t.text)) L.push(`| \`--text-${k}\` | ${v} (${px(v)}) | ${line(t, k)} | ${TEXT_USE[k] ?? ''} |`)
  L.push('')
  L.push('### Leading, tracking, rules')
  L.push('- A `text-*` class sets its line height with its size (the Line column, shipped as `--text-sm--line-height` and so on), so bare UI text needs no `leading-*`.')
  L.push(`- **Leading roles** — ${Object.entries(t.leading).map(([k, v]) => `\`leading-${k}\` ${v} (${LEADING_USE[k] ?? ''})`).join(' · ')}.`)
  L.push(`- **Tracking roles** — ${Object.entries(t.tracking).map(([k, v]) => `\`tracking-${k}\` ${v.replace('-', '−')} (${TRACKING_USE[k] ?? ''})`).join(' · ')}.`)
  L.push('- Each role is a class and a variable (`leading-reading`, `--leading-reading`). They are named for the text they set: `leading-snug`, `tracking-tight` and `tracking-wide` are Tailwind\'s own and keep Tailwind\'s values, so never redefine them. `body` and `h1`–`h6` already carry their roles from the base layer.')
  L.push('- **Headings** — Fraunces at weight 400 (never heavy or bold), tight tracking; `h1` in `--fraunces-display`, every other heading and `font-heading` text in `--fraunces-text`.')
  L.push(`- **The one accent word** — italicize exactly one word per headline in the accent (\`--accent-pigment-text\`, ${DEFAULT_ACCENT} by default) with \`--fraunces-accent\`. Never two.`)
  L.push('- **Body / UI** — Raleway 400/500/600; relaxed leading for reading copy.')
  L.push('- **Eyebrows / labels** — Raleway, uppercase, `--text-xs`, `tracking-eyebrow`, `--ink-muted`; the accent variant carries a short leading dash.')
  L.push('- **Captions** — small Fraunces italic in `--ink-muted` with `--fraunces-caption`.')
  L.push('- Sentence case in prose and headings; uppercase only for eyebrows.')
  return L.join('\n')
}

export function renderSpacingSection(t = tokens, { compact = false } = {}) {
  const steps = Object.entries(t.spacing).sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]))
  const L = []
  if (!compact) L.push(`A **4px base step** (\`--space-1\` = ${t.spacing['1']}). Editorial rhythm — sections breathe.`, '')
  // The rules file every app session loads gets the short forms; llms.txt and DESIGN.md the full ones.
  if (compact) L.push(`Steps (\`--space-N\` = N × 4px, classes \`p-N\`, \`gap-N\`…): ${steps.map(([k]) => k).join(' · ')}.`)
  else L.push(steps.map(([k, v]) => `\`--space-${k.replace('.', '_')}\` ${px(v)}`).join(' · '))
  L.push('')
  if (compact) L.push('Components sit on `--space-4` / `--space-6`; sections breathe with `--space-24`. Write the class (`p-4` → `var(--space-4)`); a step outside the list (`p-13`) or a bracket (`p-[13px]`) is off the system, and `quill-check` flags it.')
  else L.push('Components sit on `--space-4` / `--space-6`; sections breathe with `--space-24`. In a component write the class (`p-4`, `gap-6`): it compiles to the variable (`padding: var(--space-4)`), so the class and the token are one thing. These steps are the whole scale: a Tailwind step outside it (`p-13`, `p-3.25`) or a bracket (`p-[13px]`) is off the system, and `quill-check` flags it with the nearest step. In hand-written CSS use the variable.')
  L.push('')
  L.push('### Sizes')
  L.push('Past the spacing steps, sizes are named for their job: `w-card`, `max-w-page`, `h-frame` (→ `var(--size-card)`). Widths go on `w-`, `max-w-`, `min-w-`, `basis-`; heights on `h-`, `min-h-`, `max-h-`, `size-`. A height is never padding or a width, and Tailwind\'s `max-w-md` or `w-64` is not Quill\'s: `quill-check` flags both.')
  L.push('')
  const sizeList = (group) => Object.entries(t.size[group]).map(([k, v]) => `- \`${group === 'width' ? 'w' : 'h'}-${k}\` ${px(v)} — ${SIZE_JOBS[group][k]}`)
  const sizeLine = (group) => Object.entries(t.size[group]).map(([k, v]) => `${group === 'width' ? 'w' : 'h'}-${k} ${parseFloat(px(v))}`).join(' · ')
  if (compact) L.push(`Widths (px): ${sizeLine('width')}.`, '', `Heights (px): ${sizeLine('height')}. What each is for: llms.txt, Sizes.`)
  else L.push('Widths:', ...sizeList('width'), '', 'Heights:', ...sizeList('height'))
  L.push('')
  L.push('### Layout')
  L.push(`${compact ? '' : 'Marketing pages sit in `max-w-page-wide` (1400px), app pages in `max-w-page` (880px), a reading column in `max-w-measure` (672px); s'}${compact ? 'S' : ''}ide padding **48px** on desktop (\`px-12\`) and **24px** on mobile (\`px-6\`), vertical section rhythm **96px** (\`py-24\`; \`py-12\` on mobile).`)
  L.push('')
  L.push('### Composition')
  L.push('- Recurring section header: eyebrow → headline (one accent word) → right-aligned italic caption.')
  L.push('- One idea per section: a heading plus one composition (a grid of cards, a table, a form), never a stack of unrelated widgets.')
  L.push('- No hero-metric row above an identical card grid — that is the generic dashboard Quill exists to avoid. Lead with the thing the page is about; let numbers sit inside it.')
  return L.join('\n')
}

export function renderEffectsSection(t = tokens) {
  const L = []
  L.push('### Corner radii')
  L.push(Object.entries(t.radius).map(([k, v]) => `\`--radius-${k}\` ${px(v)}`).join(' · ') + `; \`--radius\` (${t.radiusBase}) is the shadcn base.`)
  L.push('Cards use `rounded-xl`, buttons and inputs `rounded-lg`, pills `rounded-full`.')
  L.push('')
  L.push('### Elevation')
  L.push('Shadows are ink-tinted, layered and re-cut per theme — never a hard black drop. `--shadow-xs` hairline lift · `--shadow-sm` low surfaces · `--shadow` raised popovers and menus · `--shadow-lg` dialogs · `--shadow-pop` the strongest lifted state. Cards sit flat on the paper with a hairline ring, no shadow.')
  L.push('')
  L.push('### Motion')
  L.push(`House easing \`--ease-out\` (\`${t.motion.easeOut}\`); soft \`--ease-soft\` (\`${t.motion.easeSoft}\`). Durations \`--dur-fast\` ${t.motion.durFast} · \`--dur\` ${t.motion.dur} · \`--dur-slow\` ${t.motion.durSlow}. Lifts \`--lift\` (${t.motion.lift}) and \`--lift-sm\` (${t.motion.liftSm}) for hover on interactive surfaces; presses settle 1px down. Nothing bounces, nothing loops; respect \`prefers-reduced-motion\`.`)
  return L.join('\n')
}

export function renderFoundations(t = tokens, { compact = false } = {}) {
  return [
    '### Type',
    renderTypeSection(t).replace(/^### /gm, '#### '),
    '',
    '### Spacing & layout',
    renderSpacingSection(t, { compact }).replace(/^### /gm, '#### '),
    '',
    '### Effects',
    renderEffectsSection(t).replace(/^### /gm, '#### '),
  ].join('\n')
}

/**
 * The point of view, then the rules that make it show up in code. `blockCount`
 * comes from the registry so the number is never typed here.
 */
export function renderPrinciples({ blockCount } = {}) {
  const blocks = blockCount ? `${blockCount} composable blocks` : 'composable blocks'
  const L = []
  L.push('Three principles name the point of view; the rules underneath are how they show up in code.')
  L.push('')
  L.push('- **Paper first.** Every surface, a texture you can almost feel, with a typeset that has an unhurried editorial rhythm. Everything sits on digital paper (`--paper`, `--paper-warm`, `--paper-deep`); warmth comes from the material, not decoration.')
  L.push('- **One italic word.** Emphasis is earned. A single accented italic per headline — never two, never shouted.')
  L.push('- **A gentle settle.** Hovers lift, presses set down. Nothing bounces, nothing loops, nothing hurries you along.')
  L.push('')
  L.push('### Rules')
  L.push('- **Author against semantic tokens** — `--paper`, `--ink`, `--card`, `--primary`, `--ring` and the rest; never the per-theme `dk-*` / `cl-*` / `cd-*` / `int-*` sets and never a raw hex. That is what makes every theme free.')
  L.push(`- **Ink for actions, accent for meaning** — primary actions are ink (\`--primary\`). The accent pigment (${DEFAULT_ACCENT} by default; \`--accent-pigment-text\` for text, \`--link\`, \`--ring\`) is reserved for the one accent word, eyebrows, links and the focus ring. Terracotta is the danger pigment: never a hover colour, and a focus ring only when it is the chosen accent.`)
  L.push(`- **Reach for a block before building one** — the registry ships ${blocks} (activity feed, empty state, page header, theme selector, data table…). A hand-built copy drifts from the AA-checked tokens the moment it lands. When no block or primitive fits, compose from primitives and semantic tokens within these rules and name the gap, rather than inventing a new pattern.`)
  L.push('- **Made for people** — WCAG 2.1 AA is a feature, not a checkbox: text cuts clear 4.5:1 on every theme ground, interactive borders clear 3:1, charts use the CVD-safe chart tokens in fixed order, motion has a reduced-motion path.')
  L.push('- **Content** — sentence case everywhere (uppercase only for eyebrows); state the decision, then the reason; no hype punctuation, no emoji.')
  L.push('')
  L.push("### Do / Don't")
  L.push('**Do** — sit everything on digital paper; reserve the accent for the one accent word, eyebrows, links and the focus ring; use ink for primary actions; warm layered shadows; Fraunces light and tight for headings.')
  L.push('')
  L.push('**Don\'t** — pure white or pure black in Dawn and Dusk (the Classic themes use them by design); a hand-set focus colour (`--ring` belongs to the accent axis); terracotta on hover; blue-purple gradients; any gradient except the AI gradient in its seven placements; glassmorphism or purple-glow dark mode; emoji; heavy or bold Fraunces; tight body leading; bouncy or looping motion.')
  L.push('')
  L.push('**The AI gradient** is the only gradient Quill ships and means one thing: AI. Ember (gold → terracotta → indigo), fixed across accents, via the `ai-*` utilities only. Seven placements: the AI mark; the composer\'s edge; a top-to-bottom wash on an AI panel or popover; motion while AI works; one soft glow on an AI home page; gradient text on an AI feature\'s heading; the fill of an AI usage meter. Never on answer text; Accept, Replace or Send; charts; status colours; anything not AI. One of `ai-edge` / `ai-edge-working` per element (same background); the edge fills with `--background`, so use it on page-background surfaces.')
  L.push('')
  L.push('### Anti-references')
  L.push('- The generic SaaS/shadcn default look: white cards, blue accents, hero-metric rows, identical card grids.')
  L.push('- The cold gray enterprise dashboard — a dashboard where a notebook belongs.')
  L.push('- Loud startup maximalism: neon gradients, glassmorphism, purple-glow dark mode.')
  return L.join('\n')
}
