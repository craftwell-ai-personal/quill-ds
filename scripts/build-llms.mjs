/**
 * Generates public/llms.txt — the machine-readable reasoning layer for Quill —
 * and refreshes the generated spans in DESIGN.md (type, spacing, effects,
 * principles), which render from the same foundations module so the human doc
 * and the agent doc cannot disagree.
 *
 * Everything here is derived from the single sources (token module, registry,
 * intent vocabulary, package version, src/usage/foundations.mjs) so the outputs
 * cannot drift from the system they describe. `scripts/build-llms.test.mjs`
 * fails CI if a committed output is stale. Run `npm run build:llms` after
 * touching tokens, the registry, or the foundations module.
 *
 * Follows the llms.txt convention (llmstxt.org): H1 + blockquote + H2 sections.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { tokens } from '../src/tokens/quill.tokens.mjs'
import { ALL_MODES, DEFAULT_MODE, DEFAULT_ACCENT } from './build-tokens.mjs'
import { INTENT_TAGS } from './registry-intent-tags.mjs'
import { ALL_USAGE } from '../src/usage/index.mjs'
import { EXAMPLES } from '../src/usage/examples.mjs'
import {
  renderFoundations,
  renderPrinciples,
  renderTypeSection,
  renderSpacingSection,
  renderEffectsSection,
} from '../src/usage/foundations.mjs'
import { renderRolesSection } from '../src/usage/roles.mjs'
import { shippedComponents } from './build-agent-rules.mjs'
import { isMain } from './lib/is-main.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const registry = JSON.parse(readFileSync(join(root, 'registry.json'), 'utf8'))
const HOME = registry.homepage.replace(/\/$/, '')

// Both lists are derived, never restated. A hand-kept copy of the theme names
// beside this line is what published `intelligent → undefined` from v0.8.25
// until it was caught three weeks later.
const themeLine = ALL_MODES.map(
  (m) => `\`${m.attr}\` → ${m.label}${m.attr === DEFAULT_MODE.attr ? ' (default)' : ''}`,
).join(', ')
const accents = Object.keys(tokens.accents)
const accentList = accents.map((a) => (a === DEFAULT_ACCENT ? `${a} (default)` : a)).join(', ')

// Counts are spelled out in prose, so they are derived too — "four-theme" was
// still in the summary line a fortnight after the fifth theme shipped.
const COUNT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const countWord = (n) => COUNT_WORDS[n] ?? String(n)

export function renderLlms(t = tokens) {
  const blocks = registry.items.filter((i) => i.type === 'registry:block')
  const { shipped, shippedList, shippedCount } = shippedComponents(registry)
  const usageByName = new Map(ALL_USAGE.map((u) => [u.name, u]))
  const L = []
  const p = (s = '') => L.push(s)

  // registry.name is the namespace slug shadcn derives (`quill` → `@quill`),
  // not a display name; the H1 stays the human title.
  p('# Quill Design System')
  p()
  p(`> ${registry.items.find((i) => i.name === 'quill').description} A self-hosted shadcn registry with a ${countWord(ALL_MODES.length)}-theme, ${countWord(accents.length)}-accent token layer, WCAG 2.1 AA targets, and ${blocks.length} composable blocks. Version ${pkg.version}.`)
  p()
  p(`Install any item with the shadcn CLI against \`${HOME}/r/<name>.json\` (e.g. \`npx shadcn@latest add ${HOME}/r/quill.json\` for the theme, then blocks). Primitives are stock shadcn restyled by the theme layer — Quill ships the theme, ${shippedCount} components of its own (${shippedList}, from \`@quill/\`), and the blocks below, not re-copied primitives.`)
  p()

  p('## Agent quick start')
  p()
  p(`1. Install the token layer: \`npx shadcn@latest add @quill/quill\` — the \`@quill\` namespace is listed in shadcn's registry directory, so it needs no configuration (to pin the URL yourself, add \`"@quill": "${HOME}/r/{name}.json"\` to \`components.json\` \`registries\`, or install by URL: \`npx shadcn@latest add ${HOME}/r/quill.json\`). Read what the CLI prints: it is the theming contract. List everything with \`npx shadcn@latest search @quill\`.`)
  p('2. Install the rules file for AI agents: `npx shadcn@latest add @quill/agent-rules` writes `.claude/rules/quill.md` at the project root, which Claude Code loads every session (theming contract, foundations, principles, icon names, block index).')
  p(`   Not in Claude Code? Connect any MCP client (Cursor, Claude Desktop, claude.ai) to \`${HOME}/mcp/\` — tools: find_component, get_component, get_setup, get_foundations.`)
  p('3. Set `data-theme` and `data-accent` on `<html>` (see Theming). The `theme-selector` block owns both at runtime.')
  p(`4. Before hand-building a section, pick a block from Components below by its intent and install it: \`npx shadcn@latest add @quill/<name>\`. Primitives (button, card, input…) come from shadcn itself and are restyled by the theme; ${shippedList} come from \`@quill/\` (\`npx shadcn@latest add @quill/<name>\`).`)
  p(`5. Read the usage guide for everything you use — \`${HOME}/usage/<name>.md\` — for the rules, what to reach for instead, and the accessibility notes.`)
  p('6. Update an item with `npx shadcn@latest add @quill/<name> --overwrite`. `--yes` does not overwrite a changed file: it prompts in a terminal and silently skips when non-interactive.')
  p('7. Verify in the app: `npx tsc --noEmit`, `npm run lint`; then switch `data-theme` and `data-accent` and confirm both take effect.')
  p()
  p(`Machine-readable: the registry index at \`${HOME}/r/registry.json\`, one item per \`${HOME}/r/<name>.json\`.`)
  p()

  p('## Theming')
  p()
  p(`- **Themes** — set \`data-theme\` on \`<html>\`: ${themeLine}. Consumers must match one of these values; the token layer re-declares aliases so scoped \`data-theme\` islands work, not just the root switch.`)
  p(`- **Accents** — set \`data-accent\` on \`<html>\`: ${accentList}. The accent drives links, eyebrows, focus rings (\`--ring\`), and accent italics; it defaults to ${DEFAULT_ACCENT} when unset.`)
  p(`- Both attributes are independent of the color-scheme; dark grounds and accent are separate axes.`)
  p()

  p('## Tokens')
  p()
  p(renderRolesSection(t))
  p()
  p(`- **Accent-driven** — \`--link\`, \`--ring\`, and accent text follow \`data-accent\` (default ${DEFAULT_ACCENT}-deep). Never hardcode a pigment for these.`)
  p('- **Charts** — use the chart tokens, never raw pigments (raw pigments fail colorblind-safety as data marks):')
  p(`  - Categorical: \`--chart-1\`…\`--chart-5\` (${Object.keys(t.color.chart.series).length} colorblind-safe series cuts). **Assign in fixed order; never cycle or repaint survivors when a series is filtered out.**`)
  p(`  - Magnitude: \`--chart-seq-1\`…\`--chart-seq-5\` (one-hue sequential ramp).`)
  p(`  - Polarity: \`--chart-div-1\`…\`--chart-div-5\` (diverging ramp, neutral midpoint — never red/green).`)
  p('- **Accessibility** — WCAG 2.1 AA: text cuts clear 4.5:1 on every theme ground; interactive control borders clear non-text 3:1.')
  p()

  p('## Foundations')
  p()
  p('Type, spacing, radii, elevation and motion, rendered from the token source. Every custom property named here ships in the theme item; a name that does not exist cannot appear.')
  p()
  p(renderFoundations(t))
  p()

  p('## Principles')
  p()
  p(renderPrinciples({ blockCount: blocks.length }))
  p()

  p('## Component intents')
  p()
  p('Blocks are tagged with an intent vocabulary so you can pick by the job to be done:')
  p()
  for (const [tag, def] of Object.entries(INTENT_TAGS)) p(`- \`${tag}\` — ${def}`)
  p()

  p('## Components')
  p()
  p('Each block is a composition of restyled primitives. `intent` lists its jobs; `use_when` says when to reach for it; `Not for` names the jobs it is the wrong pick for, with the block to pick instead.')
  p()
  for (const b of blocks) {
    const intent = (b.meta?.intent ?? []).join(', ')
    const guide = usageByName.has(b.name) ? ` · [usage guide](${HOME}/usage/${b.name}.md)` : ''
    const notFor = b.meta?.not_for ? ` Not for: ${b.meta.not_for}.` : ''
    p(`- [${b.title ?? b.name}](${HOME}/r/${b.name}.json) — _[${intent}]_ ${b.meta?.use_when ?? b.description}${notFor}${guide}`)
  }
  p()

  p('## Examples — start from a page, not from scratch')
  p()
  p('Each example is a whole page composed from the blocks above; its docs carry the composition order and the spacing rules. Install one and replace the sample content: `npx shadcn@latest add @quill/<name>`.')
  p()
  for (const e of EXAMPLES) {
    const guide = usageByName.has(e.name) ? ` · [usage guide](${HOME}/usage/${e.name}.md)` : ''
    p(`- [${e.title}](${HOME}/r/${e.name}.json) — ${e.description} Composition: ${e.blocks.join(' → ')}.${guide}`)
  }
  p()

  const primitives = ALL_USAGE.filter((u) => u.kind === 'component')
  if (primitives.length) {
    p('## Primitive usage guides')
    p()
    p("Per-primitive usage rules — when to use, what to reach for instead, do/don't, accessibility:")
    p()
    const quillUi = new Set(shipped)
    for (const u of primitives) p(`- [${u.name}](${HOME}/usage/${u.name}.md)${quillUi.has(u.name) ? ' (`@quill/`)' : ''} — ${u.summary}`)
    p()
  }

  p('## Links')
  p()
  p(`- [Storybook](${HOME}/storybook/) — live components, foundations, and patterns`)
  p(`- [Storybook component manifest](${HOME}/storybook/manifests/components.json) — every component with its description, props and story source, for the Storybook MCP (\`@storybook/addon-mcp\`)`)
  p(`- [Theme item](${HOME}/r/quill.json) — the token layer (install first)`)
  p(`- [Agent rules item](${HOME}/r/agent-rules.json) — \`.claude/rules/quill.md\` for the app's AI agents`)
  p(`- [Full registry index](${HOME}/r/registry.json)`)
  p('- License: MIT (https://github.com/craftwell-ai/quill-ds/blob/main/LICENSE) — copy, modify and ship without asking')
  p()

  return L.join('\n')
}

export const LLMS_PATH = join(root, 'public/llms.txt')
export const DESIGN_PATH = join(root, 'DESIGN.md')

/** The generated spans DESIGN.md carries, keyed by marker name. */
export function designSpans(t = tokens) {
  const blocks = registry.items.filter((i) => i.type === 'registry:block')
  return {
    type: renderTypeSection(t),
    spacing: renderSpacingSection(t),
    effects: renderEffectsSection(t),
    principles: renderPrinciples({ blockCount: blocks.length }),
    roles: renderRolesSection(t, { heading: '####' }),
  }
}

const marker = (name, edge) => `<!-- generated:${name}:${edge} -->`

/** Replace the text between a span's start and end markers; throws if either is missing. */
export function injectSpan(source, name, block) {
  const start = marker(name, 'start')
  const end = marker(name, 'end')
  const s = source.indexOf(start)
  const e = source.indexOf(end)
  if (s === -1 || e === -1 || e < s) throw new Error(`DESIGN.md is missing the ${start} … ${end} markers`)
  return source.slice(0, s + start.length) + '\n' + block + '\n' + source.slice(e)
}

/** Read the text currently between a span's markers (null when the markers are missing). */
export function readSpan(source, name) {
  const start = marker(name, 'start')
  const end = marker(name, 'end')
  const s = source.indexOf(start)
  const e = source.indexOf(end)
  if (s === -1 || e === -1 || e < s) return null
  return source.slice(s + start.length, e).replace(/^\n/, '').replace(/\n$/, '')
}

export function refreshDesign(source, t = tokens) {
  let out = source
  for (const [name, block] of Object.entries(designSpans(t))) out = injectSpan(out, name, block)
  return out
}

if (isMain(import.meta.url)) {
  writeFileSync(LLMS_PATH, renderLlms())
  writeFileSync(DESIGN_PATH, refreshDesign(readFileSync(DESIGN_PATH, 'utf8')))
  console.log('wrote public/llms.txt and the generated spans in DESIGN.md')
}
