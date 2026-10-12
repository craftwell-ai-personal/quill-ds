/**
 * What the Paper file holds: one page per piece, laid out like the owner's other
 * Paper library ("Mantis Design System").
 *
 *   Foundations
 *   ❖ <Component>   one page per component, title case, alphabetical
 *   ◆ <Block>       one page per block
 *   ▣ <Template>    one page per page template
 *
 * The list is derived from the source folders, so a new
 * component, block or template shows up here (as `pending`) the moment its file exists:
 *
 *   components   src/components/ui/*.tsx and registry/lib/*.tsx (one piece per name)
 *   blocks       registry/blocks/*.tsx
 *   templates    registry/examples/*.tsx
 *
 * Which stories a page shows is a rule (`selectStories`), with per-piece exceptions in
 * ./pieces.config.mjs. Everything here reads files only: no Storybook, no Paper.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { blockHash } from '../lib/source-hash.mjs'
import { canonicalStory } from './png-diff.mjs'
import { root } from './file.mjs'
import { CONFIG, MAX_STORIES, NAMES } from './pieces.config.mjs'

export const KINDS = {
  component: { mark: '❖', eyebrow: 'Quill · Component' },
  block: { mark: '◆', eyebrow: 'Quill · Block' },
  template: { mark: '▣', eyebrow: 'Quill · Template' },
}
const GENERATED = new Set(['icons.core.mjs', 'icons.generated.d.ts'])
const squash = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '')
const tsx = (dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((file) => file.endsWith('.tsx') && !GENERATED.has(file)).map((file) => file.replace(/\.tsx$/, '')) : [])

/** `ai-badge` → `AI Badge`, `login-oauth` → `Login OAuth`: title case, with the words that are not words spelled right. */
export function titleCase(slug) {
  if (NAMES[slug]) return NAMES[slug]
  const words = { ai: 'AI', otp: 'OTP', faq: 'FAQ', oauth: 'OAuth', kbd: 'Kbd' }
  return slug.replace(/^example-/, '').split('-').map((word) => words[word] ?? word[0].toUpperCase() + word.slice(1)).join(' ')
}

// ------------------------------------------------------------------ story files (parsed, never run)

/** Every `*.stories.tsx` under src/stories with its title, the modules it imports and its exported stories. */
export function storyFiles(dir = 'src/stories') {
  const found = []
  const walk = (folder) => {
    for (const entry of readdirSync(join(root, folder), { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`
      if (entry.isDirectory()) walk(path)
      else if (/\.stories\.tsx?$/.test(entry.name)) found.push(parseStoryFile(path, readFileSync(join(root, path), 'utf8')))
    }
  }
  walk(dir)
  return found.sort((a, b) => a.path.localeCompare(b.path))
}

/** Storybook's id for a story: the title and the export name, each lower-cased with runs of other characters as one dash. */
export function storyId(title, exportName) {
  const dashed = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  // `AllVariants` → `All Variants`, `KeyCode229` → `Key Code 229`, `AIHome` → `AI Home`
  const spaced = exportName.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([0-9])([A-Za-z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
  return `${dashed(title)}--${dashed(spaced)}`
}

export function parseStoryFile(path, source) {
  // the meta's title, not the first `title:` in the file (a story's sample data has titles too)
  const title = source.match(/(?:const meta\b|export default)[\s\S]*?\btitle:\s*(['"`])(.+?)\1/)?.[2] ?? null
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1])
  const exports = [...source.matchAll(/^export const (\w+)\s*(?::\s*[\w<>[\], ]+)?\s*=/gm)].map((match) => match[1])
  return { path, title, imports, ids: title ? exports.map((name) => storyId(title, name)) : [] }
}

// ------------------------------------------------------------------ the inventory

const tail = (module) => module.split('/').slice(-2).join('/')

/** Every piece the system has, with the files behind it. Sorted as the pages are. */
export function inventory(files = storyFiles()) {
  const pieces = []
  const importing = (folder, slug) => files.filter((file) => file.imports.some((module) => tail(module) === `${folder}/${slug}`))
  const own = (slug, list) => list.filter((file) => squash(basename(file.path).replace(/\.stories\.tsx?$/, '')) === squash(slug.replace(/^example-/, '')) || squash(basename(file.path)).startsWith(squash(slug.replace(/^example-/, ''))))

  const lib = new Set(tsx('registry/lib'))
  for (const slug of new Set([...tsx('src/components/ui'), ...lib])) {
    // a Quill component's code is the registry cut; src/components/ui holds a one-line re-export of it
    const code = lib.has(slug) ? `registry/lib/${slug}.tsx` : `src/components/ui/${slug}.tsx`
    const stories = own(slug, files.filter((file) => !file.path.includes('/patterns/') && !file.path.includes('/examples/'))).filter((file) => squash(basename(file.path).replace(/\.stories\.tsx?$/, '')) === squash(slug))
    pieces.push({ slug, kind: 'component', code, storyFiles: stories.map((file) => file.path) })
  }
  for (const slug of tsx('registry/blocks')) {
    const users = importing('blocks', slug)
    const mine = own(slug, users)
    pieces.push({ slug, kind: 'block', code: `registry/blocks/${slug}.tsx`, storyFiles: (mine.length ? mine : users).map((file) => file.path) })
  }
  for (const slug of tsx('registry/examples')) {
    const users = importing('examples', slug)
    const mine = own(slug, users)
    pieces.push({ slug, kind: 'template', code: `registry/examples/${slug}.tsx`, storyFiles: (mine.length ? mine : users).map((file) => file.path) })
  }
  const rank = Object.keys(KINDS)
  return pieces
    .map((piece) => {
      const usage = `src/usage/${piece.slug}.usage.mjs`
      const sources = [piece.code, ...piece.storyFiles, ...(existsSync(join(root, usage)) ? [usage] : []), ...(piece.kind === 'template' ? ['src/usage/examples.mjs'] : [])]
      return { ...piece, name: titleCase(piece.slug), sources, usage: existsSync(join(root, usage)) ? usage : null, config: CONFIG[piece.slug] ?? {} }
    })
    .sort((a, b) => rank.indexOf(a.kind) - rank.indexOf(b.kind) || a.name.localeCompare(b.name))
}

export const pageName = (piece) => `${KINDS[piece.kind].mark} ${piece.name}`
export const pageOrder = (pieces) => pieces.map(pageName)

/** `usage-meter / card`: the layer that holds one converted story. */
export const pieceLayerName = (piece, id, part = null) => `${piece.slug} / ${id.split('--')[1]}${part ? ` · ${part}` : ''}`

// ------------------------------------------------------------------ which stories are design states

// the docs page; Do/Don't pairs (also `minimal-do-dont`); a `Dark` story is another theme, and this file is Dawn only
const NEVER = [/--docs$/, /do-?dont$/, /--dark$/]

/**
 * The stories a page shows, from Storybook's index (`entries`: id → entry with tags).
 *   never    the docs page, Do/Don't pairs, `Dark` stories, stories tagged `!autodocs` (the repo's mark for test-only stories)
 *   always   the canonical story (./png-diff.mjs canonicalStory), first
 *   plus     every other story with no play function (Storybook tags those `play-fn`): a story that
 *            needs a script to reach its state is a test, a story that renders its state is a design
 *   then     the piece's `include` / `exclude` in pieces.config.mjs, and a cap (canonical kept)
 */
export function selectStories(piece, entries, { max = MAX_STORIES } = {}) {
  const config = piece.config ?? {}
  const paths = new Set(piece.storyFiles.map((path) => `./${path}`))
  const all = Object.values(entries).filter((entry) => entry.type === 'story' && paths.has(entry.importPath))
  const shown = all.filter((entry) => !NEVER.some((pattern) => pattern.test(entry.id)) && entry.tags?.includes('autodocs'))
  const canonical = canonicalStory(piece.slug.replace(/^example-/, ''), shown.map((entry) => entry.id))
  const excluded = new Set(config.exclude ?? [])
  const chosen = [canonical, ...shown.filter((entry) => !entry.tags.includes('play-fn')).map((entry) => entry.id), ...(config.include ?? [])]
  const known = new Set(all.map((entry) => entry.id))
  const unique = [...new Set(chosen.filter(Boolean))].filter((id) => !excluded.has(id) || id === canonical)
  const missing = unique.filter((id) => !known.has(id) && !entries[id])
  const limit = config.max ?? max
  // an `include` is a decision, so it survives the cap; the rule's own extras are what gets trimmed
  const kept = [...unique.filter((id) => id === canonical || config.include?.includes(id)), ...unique.filter((id) => id !== canonical && !config.include?.includes(id))].slice(0, Math.max(limit, 1 + (config.include?.length ?? 0)))
  return { stories: unique.filter((id) => kept.includes(id) && !missing.includes(id)), canonical, available: shown.length, trimmed: unique.length - kept.length, missing }
}

// ------------------------------------------------------------------ source hash, summary, staleness

/** The code behind a piece, hashed by scripts/lib/source-hash.mjs: comments and whitespace do not count. */
export function sourceHash(piece, read = (path) => readFileSync(join(root, path), 'utf8')) {
  return blockHash(piece.sources.map(read).join('\n'))
}

export async function summaryOf(piece) {
  if (piece.config?.summary) return piece.config.summary
  if (piece.kind === 'template') {
    // page templates are described once, in src/usage/examples.mjs
    const { EXAMPLES } = await import(pathToFileURL(join(root, 'src/usage/examples.mjs')).href)
    const described = EXAMPLES.find((example) => example.name === piece.slug)?.description
    if (described) return described
  }
  if (!piece.usage) return `${piece.name}: a Quill ${piece.kind}.`
  const { usage } = await import(pathToFileURL(join(root, piece.usage)).href)
  return usage.summary
}

/** `components-button--all-variants` → `All variants`, when Storybook's index is not at hand. */
export const storyTitle = (id) => { const words = id.split('--')[1].replace(/-/g, ' '); return words[0].toUpperCase() + words.slice(1) }

/**
 * Where every piece stands, from files alone (safe in CI):
 *   declined      config says so, with a reason
 *   pending       never written to Paper
 *   error         the last sync failed for it
 *   stale         written, but its code has changed since
 *   in step       written from the code as it is now
 */
export function statusOf(state, pieces = inventory()) {
  return pieces.map((piece) => {
    const recorded = state.pieces.find((entry) => entry.slug === piece.slug)
    const base = { slug: piece.slug, kind: piece.kind, page: pageName(piece) }
    if (piece.config.declined) return { ...base, status: 'declined', reason: piece.config.declined }
    if (!recorded || recorded.status === 'pending') return { ...base, status: 'pending' }
    if (recorded.status === 'error') return { ...base, status: 'error', reason: recorded.error }
    const now = sourceHash(piece)
    return { ...base, status: recorded.sourceHash === now ? 'in step' : 'stale', syncedAt: recorded.syncedAt }
  })
}
