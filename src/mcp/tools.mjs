/**
 * The Quill MCP server's tools as plain functions, so `node --test` can call them
 * without Next. src/app/mcp/route.ts only registers them.
 *
 * Every answer is read from the single sources — the usage modules, registry.json,
 * the foundations and theme-docs renderers — so an edit there reaches MCP clients
 * on the next deploy with no build step of its own.
 */
import registry from '../../registry.json' with { type: 'json' }
import { ALL_USAGE } from '../usage/index.mjs'
import { renderUsageDocs } from '../usage/render.mjs'
import { EXAMPLES } from '../usage/examples.mjs'
import { themeDocsParagraphs } from '../usage/theme-docs.mjs'
import { renderTypeSection, renderSpacingSection, renderEffectsSection, renderPrinciples } from '../usage/foundations.mjs'

export const HOME = registry.homepage.replace(/\/$/, '')
// Trailing slash: next.config.ts sets trailingSlash, so the bare path 308-redirects.
export const MCP_URL = `${HOME}/mcp/`

const usageByName = new Map(ALL_USAGE.map((u) => [u.name, u]))
const registryByName = new Map(registry.items.map((i) => [i.name, i]))
// Agents type names the way humans say them; collapse to the kebab-case key.
const compact = (s) => s.replace(/-/g, '')
const byCompactName = new Map(ALL_USAGE.map((u) => [compact(u.name), u.name]))

export const MAX_NAME = 64

export function normalizeName(name) {
  const kebab = String(name).trim().toLowerCase().replace(/[\s_]+/g, '-')
  return usageByName.has(kebab) || registryByName.has(kebab) ? kebab : byCompactName.get(compact(kebab)) ?? kebab
}

// Quill's own items (blocks, icon, tone-badge) come from the registry URL;
// everything else with a guide is a stock shadcn primitive restyled by the theme.
export function installCommand(name) {
  return registryByName.has(name)
    ? `npx shadcn@latest add ${HOME}/r/${name}.json`
    : `npx shadcn@latest add ${name}`
}

// Same page build-usage.mjs writes to public/usage/<name>.md.
const renderPage = (u) => `# ${u.name} (${u.kind})\n\n${renderUsageDocs(u, { format: 'markdown' })}`

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = cur
    }
  }
  return row[b.length]
}

export function getComponent(name) {
  const key = normalizeName(name)
  const u = usageByName.get(key)
  const example = EXAMPLES.find((e) => e.name === key)
  if (u) {
    // an example page's guide is followed by its order, which lives in src/usage/examples.mjs, not in the guide
    const composition = example ? `\n\nComposition: ${example.blocks.join(' → ')}.` : ''
    return { ok: true, text: `${renderPage(u).trimEnd()}${composition}\n\n### Install\n\`${installCommand(key)}\`\n` }
  }
  if (example) {
    return {
      ok: true,
      text: `# ${example.title}\n\n${example.description}\n\nComposition: ${example.blocks.join(' → ')}.\n\n### Install\n\`${installCommand(key)}\`\n`,
    }
  }
  if (registryByName.has(key)) {
    return {
      ok: true,
      text: `\`${key}\` is part of Quill's setup, not a component. Install: \`${installCommand(key)}\`. Call \`get_setup\` for the theming contract.\n`,
    }
  }
  // Public endpoint: no real name is this long, so skip the per-name edit distance
  // (cost grows with input) and never echo an unbounded string back.
  if (key.length > MAX_NAME) {
    return { ok: false, text: `No Quill component has a name that long. Call \`find_component\` with the job you need done.\n` }
  }
  const suggestions = ALL_USAGE.map((x) => [x.name, editDistance(key, x.name)])
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([n]) => `\`${n}\``)
  return {
    ok: false,
    text: `No Quill component is named "${name}". Closest real names: ${suggestions.join(', ')}. Or call \`find_component\` with the job you need done.\n`,
  }
}

const STOP = new Set(
  'a an and the to of for in on with my our your their i we you it is are be need needs want wants show shows that this some from or as at by when user users page'.split(' '),
)
// Crude stem so "deleting"/"delete" and "files"/"file" meet. Word overlap, not an
// embedding: free, predictable, and good enough when the guides name their jobs.
const stem = (w) => w.replace(/(ing|ed|s)$/, '').replace(/e$/, '')
const words = (s) => (String(s).toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)).map(stem)

const searchIndex = ALL_USAGE.map((u) => {
  const meta = registryByName.get(u.name)?.meta
  const nameWords = new Set(words(u.name.replace(/-/g, ' ')))
  const hay = new Set(words([u.name.replace(/-/g, ' '), u.summary, ...u.useWhen, ...(meta?.intent ?? []), meta?.use_when ?? ''].join(' ')))
  const notFor = new Set(words(meta?.not_for ?? u.alternatives.map((a) => a.when).join(' ')))
  return { u, nameWords, hay, notFor }
})

export function findComponent(task, limit = 5) {
  const taskWords = new Set(words(task))
  const ranked = searchIndex
    .map(({ u, nameWords, hay, notFor }) => {
      let score = 0
      for (const w of taskWords) {
        if (hay.has(w)) score += 1
        if (nameWords.has(w)) score += 1
        // A word only its "not for" line mentions means another item owns this job.
        if (notFor.has(w) && !hay.has(w)) score -= 0.5
      }
      return { u, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.u.name.localeCompare(b.u.name))
    .slice(0, limit)

  if (!ranked.length) {
    return {
      ok: false,
      names: [],
      text: 'No Quill component fits that description. Compose it from the stock primitives with Quill tokens (call `get_foundations`), and do not invent a component name.\n',
    }
  }
  const lines = ranked.map(({ u }) => `- **${u.name}** (${u.kind}) — ${u.summary}\n  Use when: ${u.useWhen[0]}`)
  return {
    ok: true,
    names: ranked.map((r) => r.u.name),
    text: `Best matches, best first. Call \`get_component\` on your pick for its rules and install line.\n\n${lines.join('\n')}\n`,
  }
}

export function getSetup() {
  return [
    '# Setting up Quill',
    '',
    `Install the theme: \`npx shadcn@latest add ${HOME}/r/quill.json\`. Then add blocks by URL (\`get_component\` gives each one's command). Primitives are stock shadcn — \`npx shadcn@latest add <name>\` — restyled by the theme.`,
    '',
    'Use only tokens the theme ships: semantic classes such as `bg-card`, `text-ink`, `text-primary`, never raw hex or stock palette colours (`bg-blue-500`).',
    '',
    ...themeDocsParagraphs().map((p) => `- ${p}`),
    '',
  ].join('\n')
}

export const FOUNDATION_TOPICS = ['type', 'spacing', 'effects', 'principles']
const blockCount = registry.items.filter((i) => i.type === 'registry:block').length
const FOUNDATIONS = {
  type: () => renderTypeSection(),
  spacing: () => renderSpacingSection(),
  effects: () => renderEffectsSection(),
  principles: () => renderPrinciples({ blockCount }),
}
const TITLES = { type: 'Type', spacing: 'Spacing & layout', effects: 'Effects', principles: 'Principles' }

export function getFoundations(topic) {
  const picked = topic ? [String(topic).trim().toLowerCase()] : FOUNDATION_TOPICS
  const unknown = picked.find((t) => !FOUNDATIONS[t])
  if (unknown) {
    return { ok: false, text: `Unknown topic "${topic}". Choose one of: ${FOUNDATION_TOPICS.join(', ')} — or omit it for all four.\n` }
  }
  return { ok: true, text: picked.map((t) => `## ${TITLES[t]}\n\n${FOUNDATIONS[t]()}`).join('\n\n') + '\n' }
}

export const SERVER_INSTRUCTIONS = [
  'Quill is a design system installed with the shadcn CLI.',
  'Before building any UI, call find_component with the job you need done; prefer a Quill block over hand-building.',
  "Call get_component on your pick and follow its Do/Don't rules and accessibility notes; use its install command exactly.",
  'Call get_setup once per app for the theme install and theming contract, and get_foundations for type, spacing, effects and principles.',
  'Use only tokens the theme ships. Never invent a component name.',
].join(' ')
