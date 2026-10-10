import { test } from 'node:test'
import assert from 'node:assert/strict'
import { REGRESSION_PCT, REGRESSION_PX } from '../figma-visual-diff.mjs'
import { acceptInto, check, compareValues, DIFF_COLORS, isOurExport, keyNodes, measured, parseTreeSummary, REGION_POINTS, renderSummary, resolveColor, resolveLength, verdictOf, worstRegion } from './check.mjs'
import { serialize } from './convert.mjs'
import { orderState, planPages, upsertPiece } from './file.mjs'
import { ARTBOARD, artboardStyles, header, section } from './page.mjs'
import { inventory, pageName, parseStoryFile, pieceLayerName, selectStories, sourceHash, statusOf, storyId, storyTitle, titleCase } from './pieces.mjs'
import { reconcile, renderStatus } from './status.mjs'
import { parseArgs, piecesToSync, stubRecord } from './sync.mjs'
import { foundationsPage } from './sync-foundations.mjs'
import { resolveTokens } from './tokens.mjs'

// what Paper's get_tokens answers, in Paper's own spellings
const TABLE = resolveTokens([
  { name: '--color-card', type: 'color', value: 'var(--color-paper-warm)' },
  { name: '--color-paper-warm', type: 'color', value: '#EFE4CE' },
  { name: '--color-border', type: 'color', value: 'rgb(42 38 34 / 12%)' },
  { name: '--color-moss', type: 'color', value: '#7A8C5C' },
  { name: '--color-foreground', type: 'color', value: '#2A2622' },
  { name: '--font-sans', type: 'fontFamily', value: 'Raleway' },
  { name: '--text-sm', type: 'fontSize', value: '13.6px' },
  { name: '--font-weight-medium', type: 'fontWeight', value: '500' },
  { name: '--leading-text-sm', type: 'lineHeight', value: '142.8571%' },
  { name: '--spacing-2', type: 'spacing', value: '8px' },
  { name: '--spacing-0_5', type: 'spacing', value: '2px' },
  { name: '--radius-xl', type: 'radius', value: '16px' },
])

test('Paper\'s tree summary is read into nodes, and cut-off branches are named', () => {
  // recorded from get_tree_summary; the text after the size is truncated by Paper at 60 characters
  const summary = 'Frame "usage-meter / card" (1T-0) 380×?\n  Frame "usage-meter" (1U-0) ?×?\n    Text "AI credits" (1V-0) ?×? "AI credits"\n    Frame "say "hi"" (1W-0) ?×?\n      ... 5 children\n    SVG "icon" (2A-0) 16×16'
  const { nodes, cut } = parseTreeSummary(summary)
  assert.deepEqual(nodes.map((node) => [node.depth, node.type, node.name, node.id]), [[0, 'Frame', 'usage-meter / card', '1T-0'], [1, 'Frame', 'usage-meter', '1U-0'], [2, 'Text', 'AI credits', '1V-0'], [2, 'Frame', 'say "hi"', '1W-0'], [2, 'SVG', 'icon', '2A-0']])
  assert.deepEqual(cut, ['1W-0'])
})

test('Paper\'s stored values resolve through its tokens', () => {
  assert.deepEqual(resolveColor('var(--color-card)', TABLE), { r: 239, g: 228, b: 206, a: 1 })
  // Paper drops the colour space and a 50 % it considers the default
  assert.equal(resolveColor('color-mix(var(--color-moss) 20%, transparent)', TABLE).a, 0.2)
  assert.equal(resolveColor('color-mix(in oklab, var(--color-moss), transparent)', TABLE).a, 0.5)
  assert.equal(resolveColor('#00000000', TABLE).a, 0)
  assert.equal(resolveColor('var(--nope)', TABLE), null)
  assert.equal(resolveLength('var(--spacing-2)', TABLE), 8)
  assert.ok(Math.abs(resolveLength('var(--leading-text-sm)', TABLE, { fontSize: 13.6 }) - 19.4286) < 0.01)
  assert.equal(resolveLength('calc(infinity * 1px)', TABLE), 9999)
  assert.equal(resolveLength('var(--font-weight-medium)', TABLE), 500)
})

test('a text layer is compared on colour, size, line height, weight and face', () => {
  const paper = { color: 'var(--color-foreground)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-weight-medium)', lineHeight: 'var(--leading-text-sm)' }
  const used = { color: 'rgb(42, 38, 34)', fontFamily: 'Raleway, -apple-system, sans-serif', fontSize: '13.6px', fontWeight: '500', lineHeight: '19.4286px' }
  assert.ok(compareValues('text', paper, used, TABLE).every((row) => row.ok))
  const wrong = compareValues('text', { ...paper, fontSize: '15px', fontFamily: '"Inter", system-ui' }, used, TABLE)
  assert.deepEqual(wrong.filter((row) => !row.ok).map((row) => row.property), ['font-size', 'font-family'])
})

test('a frame is compared on fill, radius, each padding side and border, however Paper stored the padding', () => {
  const used = { backgroundColor: 'rgba(122, 140, 92, 0.2)', borderTopLeftRadius: '3.35544e+07px', paddingTop: '2px', paddingRight: '8px', paddingBottom: '2px', paddingLeft: '8px', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'rgba(0, 0, 0, 0)' }
  const paper = { backgroundColor: 'color-mix(var(--color-moss) 20%, transparent)', borderRadius: 'calc(infinity * 1px)', paddingBlock: 'var(--spacing-0_5)', paddingInline: 'var(--spacing-2)', borderWidth: '1px', borderColor: '#00000000' }
  const rows = compareValues('frame', paper, used, TABLE)
  assert.deepEqual(rows.filter((row) => !row.ok).map((row) => row.property), [])
  assert.deepEqual(rows.map((row) => row.property), ['background-color', 'border-radius', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'border-width', 'border-color'])
  const off = compareValues('frame', { ...paper, paddingInline: '10px' }, used, TABLE)
  assert.deepEqual(off.filter((row) => !row.ok).map((row) => row.property), ['padding-right', 'padding-left'])
})

test('key nodes: the first text\'s owner, the first button, the first filled surface', () => {
  const used = (extra = {}) => ({ whiteSpace: 'normal', backgroundColor: 'rgba(0, 0, 0, 0)', ...extra })
  const button = { tag: 'button', slot: 'button', used: used({ backgroundColor: 'rgb(42, 38, 34)' }), children: [{ text: 'Send' }] }
  const title = { tag: 'p', used: used(), children: [{ text: '  ' }, { text: 'Title' }] }
  const card = { tag: 'div', used: used({ backgroundColor: 'rgb(239, 228, 206)' }), children: [title, button] }
  const tree = { tag: 'div', used: used(), children: [card] }
  const keys = keyNodes(tree)
  assert.equal(keys.text, title)
  assert.equal(keys.button, button)
  assert.equal(keys.surface, card)

  // a field shows the first text (its placeholder), styled by the field: no fair pair, and no later text stands in for it
  const field = { tag: 'textarea', used: used(), value: '', placeholder: 'Ask anything', children: [] }
  assert.equal(keyNodes({ tag: 'div', used: used(), children: [field, title] }).text, undefined)
})

test('the worst region: the share of differing pixels in the worst 12px tile, wherever it is', () => {
  // a 96×96 diff image (48×48 CSS px at 2x): grey where alike, the diff colour where not
  const image = (paint) => {
    const png = { width: 96, height: 96, data: new Uint8Array(96 * 96 * 4) }
    for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
      const [r, g, b] = paint(x, y) ? DIFF_COLORS[0] : [230, 230, 230]
      png.data.set([r, g, b, 255], (y * 96 + x) * 4)
    }
    return png
  }
  assert.deepEqual(worstRegion(image(() => false)), { pct: 0, x: 0, y: 0 })
  // a 12-CSS-px tile (24 device px) covered: 100% there, however small a share of the whole picture (12.5%)
  const missingEdge = worstRegion(image((x, y) => x >= 48 && y < 24))
  assert.deepEqual(missingEdge, { pct: 100, x: 24, y: 0 }, 'x and y in CSS px')
  // half a tile covered, where the half-step tiles cannot line up with it: still read as a half
  assert.equal(worstRegion(image((x, y) => x >= 90 && y < 24)).pct, 25)
  // scattered single pixels (text smoothing) stay low
  assert.ok(worstRegion(image((x, y) => (x * 7 + y * 13) % 29 === 0)).pct < 5)
  // the second diff colour counts too; anti-aliasing (yellow) does not
  const alt = image((x, y) => x < 48 && y < 48)
  for (let index = 0; index < 96 * 96; index++) if (alt.data[index * 4] === DIFF_COLORS[0][0]) alt.data.set(DIFF_COLORS[1], index * 4)
  assert.equal(worstRegion(alt).pct, 100)
  const smoothing = image(() => false)
  for (let index = 0; index < 96 * 96; index++) smoothing.data.set([255, 255, 0], index * 4)
  assert.equal(worstRegion(smoothing).pct, 0)
})

test('a story regresses against its own baseline: picture, size, text or values', () => {
  const row = { piece: 'button', story: 'components-button--default', title: 'Default', text: { ok: true, story: 1, paper: 1 }, values: [{ ok: true }, { ok: true }], valuesOk: 2, picture: { diffPct: 6.1, paper: [110, 32], storybook: [110, 32] } }
  const accepted = measured(row)
  assert.deepEqual(accepted, { diffPct: 6.1, paper: [110, 32], storybook: [110, 32], text: true, values: '2/2' })
  assert.deepEqual(verdictOf(row, null), { verdict: 'unbaselined', reasons: [] })
  assert.equal(verdictOf(row, accepted).verdict, 'ok')
  assert.equal(verdictOf({ ...row, picture: { ...row.picture, diffPct: 6.1 + REGRESSION_PCT } }, accepted).verdict, 'ok', 'exactly at the tolerance is not worse')
  assert.match(verdictOf({ ...row, picture: { ...row.picture, diffPct: 7.2 } }, accepted).reasons[0], /picture 7\.20% \(accepted 6\.10%\)/)
  assert.match(verdictOf({ ...row, picture: { ...row.picture, paper: [110, 32 + REGRESSION_PX + 1] } }, accepted).reasons[0], /Paper size 110×41/)
  assert.match(verdictOf({ ...row, text: { ok: false, story: 1, paper: 2 } }, accepted).reasons[0], /text no longer matches/)
  assert.match(verdictOf({ ...row, valuesOk: 1 }, accepted).reasons[0], /values 1\/2 \(accepted 2\/2\)/)
  assert.equal(verdictOf({ ...row, error: 'export produced no file' }, accepted).verdict, 'error')
})

test('a story whose worst region gets clearly worse regresses, even when the whole-picture number barely moves', () => {
  const row = { piece: 'ai-thinking', story: 'components-aithinking--working', title: 'Working', text: { ok: true, story: 2, paper: 2 }, values: [], valuesOk: 0, picture: { diffPct: 1.8, paper: [320, 60], storybook: [320, 60], worstRegion: { pct: 29, x: 0, y: 0 } } }
  const accepted = measured(row)
  assert.equal(accepted.worstRegion, 29, 'the baseline keeps the worst region\'s share')
  assert.equal(verdictOf({ ...row, picture: { ...row.picture, worstRegion: { pct: 29 + REGION_POINTS, x: 0, y: 0 } } }, accepted).verdict, 'ok', 'exactly at the tolerance is not worse')
  // "Thinking" drawn as a gradient box: 0.6 points worse overall, 57 points worse where it is
  const box = verdictOf({ ...row, picture: { ...row.picture, diffPct: 2.4, worstRegion: { pct: 86, x: 0, y: 4 } } }, accepted)
  assert.equal(box.verdict, 'regression')
  assert.deepEqual(box.reasons, ['worst region 86% at 0,4 (accepted 29%)'])
  // a baseline from before the region was measured judges the picture as before
  const old = { ...accepted }
  delete old.worstRegion
  assert.equal(verdictOf({ ...row, picture: { ...row.picture, worstRegion: { pct: 86, x: 0, y: 4 } } }, old).verdict, 'ok')
})

test('accepting writes sorted, dated entries, leaves unchecked stories alone, and refuses a text mismatch', () => {
  const row = (story, diffPct, textOk = true) => ({ piece: 'x', story, text: { ok: textOk }, values: [], valuesOk: 0, picture: { diffPct, paper: [1, 1], storybook: [1, 1] } })
  const rows = [row('b--two', 2), row('a--one', 3), { piece: 'x', story: 'c--broken', error: 'nope' }, row('d--wrong-words', 1, false)]
  const { baseline, result } = acceptInto({ stories: { 'z--kept': { diffPct: 1 } } }, rows, '2026-10-07')
  assert.deepEqual(Object.keys(baseline.stories), ['a--one', 'b--two', 'z--kept'])
  assert.deepEqual(baseline.stories['a--one'], { diffPct: 3, paper: [1, 1], storybook: [1, 1], text: true, values: '0/0', piece: 'x', at: '2026-10-07' })
  assert.deepEqual(result.accepted, ['b--two', 'a--one'])
  assert.deepEqual(result.refused, ['c--broken: errored', 'd--wrong-words: text does not match (use --force to accept anyway)'])
  assert.ok('d--wrong-words' in acceptInto({ stories: {} }, rows, '2026-10-07', { force: true }).baseline.stories)
  assert.equal('c--broken' in acceptInto({ stories: {} }, rows, '2026-10-07', { force: true }).baseline.stories, false, 'an errored story is never accepted')
})

test('accepting needs a named scope', async () => {
  await assert.rejects(check({ accept: true }), /--accept needs a scope/)
})

test('the summary leads with the counts and lists what is not ok', () => {
  const ok = { piece: 'button', story: 'a', title: 'Default', verdict: 'ok', reasons: [], text: { ok: true, story: 1, paper: 1 }, values: [{ ok: true }], valuesOk: 1, picture: { diffPct: 6.1, paper: [110, 32], storybook: [110, 32] } }
  const rows = [ok, { ...ok, story: 'b', title: 'Disabled', verdict: 'regression', reasons: ['picture 12.00% (accepted 6.10%)'], picture: { ...ok.picture, diffPct: 12, worstRegion: { pct: 41.5, x: 12, y: 0 } } }, { piece: 'tone-badge', story: 'c', title: 'Solid', verdict: 'error', error: 'export produced no file' }]
  const summary = renderSummary(rows)
  assert.match(summary, /^## Paper ↔ Storybook check: 3 stories in 2 pieces · 1 regression · 1 error · 0 without a baseline/)
  assert.match(summary, /\| button \| Disabled \| 1\/1 \| 1\/1 \| 12\.00% \| 41\.5% \| 110×32 → 110×32 \| regression: picture 12\.00% \(accepted 6\.10%\) \|/)
  assert.match(summary, /\| tone-badge \| Solid \| — \| — \| — \| — \| — \| error: export produced no file \|/)
  assert.match(summary, /1 stories match their accepted baseline/)
  assert.equal(summary.includes('| button | Default |'), false, 'a story that is fine is counted, not listed')
})

test('only a file this run exported is ever deleted from Downloads', () => {
  const since = 1_000_000
  const fresh = () => ({ mtimeMs: since + 500 })
  const ours = { layerName: 'usage-meter / card', since, downloads: '/Users/x/Downloads', stat: fresh }
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x.png', ours), true)
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x (2).png', ours), true, 'Paper numbers a name that is taken, after the scale')
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x (13).png', ours), true)
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card (2)@2x.png', ours), false, 'not the form Paper writes')
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card-final@2x.png', ours), false, 'someone else\'s similar name')
  assert.equal(isOurExport('/Users/x/Downloads/holiday.png', ours), false)
  assert.equal(isOurExport('/Users/x/Documents/usage-meter _ card@2x.png', ours), false, 'not the folder Paper writes to')
  assert.equal(isOurExport('/Users/x/Downloads/sub/usage-meter _ card@2x.png', ours), false)
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x.png', { ...ours, stat: () => ({ mtimeMs: since - 60_000 }) }), false, 'older than this call: it was there before')
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x.png', { ...ours, stat: () => ({ mtimeMs: since + 500, birthtimeMs: since - 60_000 }) }), false, 'an older file Paper wrote over: created before this call, so not ours to delete')
  assert.equal(isOurExport('/Users/x/Downloads/../Documents/usage-meter _ card@2x.png', ours), false, 'a path that climbs out of the folder')
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x.png.bak', ours), false)
  assert.equal(isOurExport('/Users/x/Downloads/*@2x.png', ours), false, 'never a pattern')
  assert.equal(isOurExport('/Users/x/Downloads/usage-meter _ card@2x.png', { ...ours, stat: () => { throw new Error('gone') } }), false)
  assert.equal(isOurExport(undefined, ours), false)
})

// ------------------------------------------------------------------ pieces, pages, state

const entry = (id, tags = ['dev', 'test', 'autodocs'], importPath = './src/stories/widget.stories.tsx') => [id, { id, type: 'story', name: id.split('--')[1], importPath, tags }]
const widget = (config = {}) => ({ slug: 'widget', kind: 'component', storyFiles: ['src/stories/widget.stories.tsx'], config })

test('the stories a page shows: canonical first, then every story without a play function; never docs, Do/Don\'t, Dark or test-only', () => {
  const entries = Object.fromEntries([
    entry('components-widget--docs', ['dev', 'autodocs']).map((value, index) => (index ? { ...value, type: 'docs' } : value)),
    entry('components-widget--sizes'),
    entry('components-widget--default', ['dev', 'test', 'autodocs', 'play-fn']),
    entry('components-widget--opens-on-enter', ['dev', 'test', 'autodocs', 'play-fn']),
    entry('components-widget--focus-ring', ['dev', 'test', 'play-fn']),
    entry('components-widget--plain-but-hidden', ['dev', 'test']),
    entry('components-widget--do-dont'),
    entry('components-widget--minimal-do-dont'),
    entry('components-widget--dark'),
    entry('components-other--default', ['dev', 'test', 'autodocs'], './src/stories/other.stories.tsx'),
  ])
  const chosen = selectStories(widget(), entries)
  assert.deepEqual(chosen.stories, ['components-widget--default', 'components-widget--sizes'], 'the canonical story is kept even though it has a play function')
  assert.equal(chosen.canonical, 'components-widget--default')
  // overrides: a state only a play function reaches, and a story not worth a section
  assert.deepEqual(selectStories(widget({ include: ['components-widget--opens-on-enter'], exclude: ['components-widget--sizes'] }), entries).stories, ['components-widget--default', 'components-widget--opens-on-enter'])
  assert.deepEqual(selectStories(widget({ exclude: ['components-widget--default'] }), entries).stories[0], 'components-widget--default', 'the canonical story cannot be excluded')
  assert.deepEqual(selectStories(widget({ include: ['components-widget--gone'] }), entries).missing, ['components-widget--gone'])
})

test('a page shows at most eight stories unless the piece says otherwise; includes survive the cap', () => {
  const many = Object.fromEntries([entry('components-widget--default'), ...Array.from({ length: 12 }, (_, index) => entry(`components-widget--variant-${String(index).padStart(2, '0')}`))])
  const capped = selectStories(widget(), many)
  assert.equal(capped.stories.length, 8)
  assert.equal(capped.stories[0], 'components-widget--default')
  assert.equal(capped.trimmed, 5)
  assert.equal(selectStories(widget({ max: 3 }), many).stories.length, 3)
  assert.ok(selectStories(widget({ include: ['components-widget--variant-11'] }), many).stories.includes('components-widget--variant-11'))
})

test('story ids are derived from a story file the way Storybook derives them', () => {
  const file = parseStoryFile('src/stories/citations.stories.tsx', `const sources = [{ title: 'Q3 board deck.pdf' }]\nconst meta = {\n  title: 'Components / Citations',\n} satisfies Meta<typeof Citations>\nexport default meta\ntype Story = StoryObj<typeof meta>\nexport const InAnAnswer: Story = {}\nexport const KeyCode229 = { play: async () => {} }\nexport const AIHome: Story = {}\nexport const DoDont: Story = {}\nconst helper = 1\nimport { Citations } from '../../registry/lib/citations'\n`)
  assert.equal(file.title, 'Components / Citations', 'the meta\'s title, not the sample data\'s')
  assert.deepEqual(file.ids, ['components-citations--in-an-answer', 'components-citations--key-code-229', 'components-citations--ai-home', 'components-citations--do-dont'])
  assert.deepEqual(file.imports, ['../../registry/lib/citations'])
  assert.equal(storyId('Patterns / AI / Conversation History', 'RenameIgnoresEnterKeyCode229'), 'patterns-ai-conversation-history--rename-ignores-enter-key-code-229')
})

test('the inventory is every component, block and template, in page order, each with a story file', () => {
  const pieces = inventory()
  const kinds = pieces.map((piece) => piece.kind)
  assert.deepEqual([...new Set(kinds)], ['component', 'block', 'template'], 'components, then blocks, then templates')
  for (const kind of ['component', 'block', 'template']) { const names = pieces.filter((piece) => piece.kind === kind).map((piece) => piece.name); assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), `${kind}s are alphabetical`) }
  assert.equal(new Set(pieces.map((piece) => piece.slug)).size, pieces.length)
  const none = pieces.filter((piece) => !piece.storyFiles.length && !piece.config.declined).map((piece) => piece.slug)
  assert.deepEqual(none, [], 'a piece with no story has nothing to draw from: give it a story, or decline it with a reason')
  // a Quill component's code is the registry cut, not the site's one-line re-export
  assert.equal(pieces.find((piece) => piece.slug === 'usage-meter').code, 'registry/lib/usage-meter.tsx')
  assert.equal(pieces.find((piece) => piece.slug === 'button').code, 'src/components/ui/button.tsx')
  assert.deepEqual(pieces.find((piece) => piece.slug === 'conversation-history').storyFiles, ['src/stories/patterns/ConversationHistory.stories.tsx'])
  for (const piece of pieces) assert.match(sourceHash(piece), /^[0-9a-f]{16}$/, piece.slug)
})

test('page and layer names', () => {
  assert.equal(pageName({ kind: 'component', name: 'AI Badge' }), '❖ AI Badge')
  assert.equal(pageName({ kind: 'block', name: 'FAQ' }), '◆ FAQ')
  assert.equal(pageName({ kind: 'template', name: 'App Page' }), '▣ App Page')
  assert.deepEqual(['ai-badge', 'input-otp', 'login-oauth', 'faq', 'error-404', 'example-app-page'].map(titleCase), ['AI Badge', 'Input OTP', 'Login OAuth', 'FAQ', 'Error 404', 'App Page'])
  assert.equal(pieceLayerName({ slug: 'usage-meter' }, 'components-usagemeter--running-low-card'), 'usage-meter / running-low-card')
  assert.equal(pieceLayerName({ slug: 'dialog' }, 'components-dialog--default', 'panel-1'), 'dialog / default · panel-1')
  assert.equal(storyTitle('components-button--all-variants'), 'All variants')
})

test('status from files alone: declined, pending, error, stale, in step', () => {
  const pieces = [
    { slug: 'a', kind: 'component', name: 'A', sources: ['a.tsx'], config: {} },
    { slug: 'b', kind: 'component', name: 'B', sources: ['a.tsx'], config: {} },
    { slug: 'c', kind: 'component', name: 'C', sources: ['a.tsx'], config: { declined: 'nothing to draw' } },
    { slug: 'd', kind: 'block', name: 'D', sources: ['a.tsx'], config: {} },
    { slug: 'e', kind: 'block', name: 'E', sources: ['a.tsx'], config: {} },
  ]
  // sourceHash reads real files; use one that exists so the hashes are real
  for (const piece of pieces) piece.sources = ['scripts/paper/page.mjs']
  const now = sourceHash(pieces[0])
  const state = { pieces: [{ slug: 'a', status: 'synced', sourceHash: now, syncedAt: '2026-10-07' }, { slug: 'b', status: 'synced', sourceHash: 'moved', syncedAt: '2026-10-01' }, { slug: 'd', status: 'error', error: 'the story rendered nothing visible' }] }
  assert.deepEqual(statusOf(state, pieces).map((row) => [row.slug, row.status]), [['a', 'in step'], ['b', 'stale'], ['c', 'declined'], ['d', 'error'], ['e', 'pending']])
  const text = renderStatus({ rows: statusOf(state, pieces), tokens: 'in step', counts: { 'in step': 1, stale: 1, pending: 1, error: 1, declined: 1 } })
  assert.match(text, /^Paper file: 5 pieces · 1 in step · 1 stale · 1 pending · 1 error · 1 declined · tokens in step/)
  assert.match(text, /❖ B\s+code changed since 2026-10-01/)
  assert.match(text, /❖ C\s+nothing to draw/)
  assert.match(text, /open Paper, then {2}npm run paper:sync/)
})

test('a sync writes what is not in step; --only and --all override', () => {
  const pieces = ['a', 'b', 'c', 'd'].map((slug) => ({ slug, config: slug === 'd' ? { declined: 'no' } : {} }))
  const statuses = [{ slug: 'a', status: 'in step' }, { slug: 'b', status: 'stale' }, { slug: 'c', status: 'pending' }, { slug: 'd', status: 'declined' }]
  const slugs = (options) => piecesToSync(pieces, statuses, options).map((piece) => piece.slug)
  assert.deepEqual(slugs({}), ['b', 'c'])
  assert.deepEqual(slugs({ all: true }), ['a', 'b', 'c'], 'a declined piece is never drawn')
  assert.deepEqual(slugs({ only: ['a', 'd'] }), ['a'])
  assert.deepEqual(stubRecord({ slug: 'd', name: 'D', kind: 'block', config: { declined: 'no' } }), { slug: 'd', name: 'D', kind: 'block', status: 'declined', reason: 'no' })
  assert.deepEqual(stubRecord({ slug: 'c', name: 'C', kind: 'block', config: {} }), { slug: 'c', name: 'C', kind: 'block', status: 'pending', page: '◆ C' })
  assert.deepEqual(parseArgs(['--only', 'button, faq', '--accept']), { summary: null, force: false, all: false, only: ['button', 'faq'], dryRun: false, prune: false, createFile: false, accept: true, base: process.env.PAPER_STORYBOOK_URL })
})

test('the script\'s pages are put in order by position: rename each slot, move an artboard that is on the wrong page', () => {
  const current = [{ id: 'p-1', name: 'Foundations' }, { id: 'p-9', name: '❖ Button' }, { id: 'p-2', name: 'Page 3' }]
  const wanted = ['Foundations', '❖ Accordion', '❖ Button', '◆ FAQ']
  const plan = planPages(current, wanted, { 'Foundations': ['f-0'], '❖ Button': ['b-0'] }, ['p-1', 'p-9', 'p-2'])
  assert.equal(plan.create, 1)
  assert.deepEqual(plan.renames.map((rename) => [rename.slot, rename.from, rename.to]), [[1, '❖ Button', '❖ Accordion'], [2, 'Page 3', '❖ Button'], [3, null, '◆ FAQ']])
  assert.deepEqual(plan.moves, [{ artboardId: 'b-0', name: '❖ Button', from: 'p-9', toSlot: 2 }], 'Button\'s artboard follows its name to the third page; Foundations stays')
  assert.deepEqual(plan.foreign, [])
  const ids = wanted.map((_, index) => `p-${index}`)
  assert.deepEqual(planPages(wanted.map((name, index) => ({ id: `p-${index}`, name })), wanted, {}, ids), { create: 0, renames: [], moves: [], foreign: [], inOrder: true })
  // a piece was removed: its page cannot be deleted, so it is parked under a name that says so, and reused later
  const extra = planPages([...wanted, '❖ Gone'].map((name, index) => ({ id: `p-${index}`, name })), wanted, {}, [...ids, 'p-4'])
  assert.deepEqual(extra.renames.map((rename) => [rename.from, rename.to]), [['❖ Gone', '(unused 1)']])
  assert.deepEqual(planPages([...wanted, '(unused 1)'].map((name, index) => ({ id: `p-${index}`, name })), wanted, {}, [...ids, 'p-4']).renames, [])
})

test('a page the script did not create is a person\'s: never renamed, never moved onto, only reported', () => {
  const wanted = ['Foundations', '❖ Accordion', '❖ Button']
  const ours = [{ id: 'p-1', name: 'Foundations' }, { id: 'p-2', name: '❖ Accordion' }, { id: 'p-3', name: '❖ Button' }]
  const owned = ['p-1', 'p-2', 'p-3']
  const mine = { id: 'x-1', name: 'My sketches' }
  const untouched = (plan) => { assert.deepEqual(plan.foreign, [mine.name]); assert.equal(plan.renames.some((rename) => rename.pageId === mine.id), false); assert.deepEqual(plan.moves, []) }
  // in the middle: the generated pages around it keep their names; nothing shifts onto it
  const middle = planPages([ours[0], ours[1], mine, ours[2]], wanted, { '❖ Button': ['b-0'] }, owned)
  untouched(middle)
  assert.deepEqual([middle.create, middle.renames, middle.inOrder], [0, [], true])
  // at the end: not turned into "(unused 1)"
  untouched(planPages([...ours, mine], wanted, {}, owned))
  // at the start: Foundations is still the script's first page
  untouched(planPages([mine, ...ours], wanted, {}, owned))
  // a name that looks generated is not proof: only a recorded id is
  const lookalike = planPages([...ours, { id: 'x-2', name: '❖ Buttons v2' }], wanted, {}, owned)
  assert.deepEqual([lookalike.foreign, lookalike.renames, lookalike.create], [['❖ Buttons v2'], [], 0])
  // a new piece: one page is created for it; the person's page is not used as the slot
  const grown = planPages([ours[0], ours[1], mine, ours[2]], [...wanted, '◆ FAQ'], {}, owned)
  assert.deepEqual([grown.create, grown.renames.map((rename) => [rename.pageId, rename.to]), grown.foreign], [1, [[null, '◆ FAQ']], [mine.name]])
  // with nothing recorded as owned, nothing in the file is touched at all
  const none = planPages([mine, ...ours], wanted, {}, [])
  assert.deepEqual([none.foreign.length, none.create, none.renames.every((rename) => rename.pageId === null)], [4, 3, true])
})

test('the record is written in a fixed order and a re-synced piece replaces its entry', () => {
  const state = { pieces: [{ slug: 'faq', kind: 'block', name: 'FAQ', status: 'pending' }, { status: 'synced', stories: [], name: 'Button', kind: 'component', slug: 'button', zeta: 1, artboardId: 'b-0' }], tokens: { count: 1 }, file: { id: 'x' } }
  const ordered = orderState(state)
  assert.deepEqual(Object.keys(ordered), ['$comment', 'file', 'tokens', 'pieces'])
  assert.deepEqual(ordered.pieces.map((piece) => piece.slug), ['button', 'faq'], 'components before blocks')
  assert.deepEqual(Object.keys(ordered.pieces[0]), ['slug', 'name', 'kind', 'status', 'artboardId', 'stories', 'zeta'])
  assert.deepEqual(orderState(ordered), ordered, 'ordering is stable')
  assert.deepEqual(upsertPiece(state, { slug: 'faq', kind: 'block', name: 'FAQ', status: 'synced' }).pieces.map((piece) => `${piece.slug}:${piece.status}`), ['button:synced', 'faq:synced'])
})

test('the page anatomy: a 1440 artboard, a three-line header, sections titled in tokens', () => {
  assert.deepEqual([artboardStyles().width, artboardStyles().padding, artboardStyles().gap, artboardStyles().height], ['1440px', '80px', '56px', 'fit-content'])
  assert.equal(ARTBOARD.width, 1440)
  const head = header('Quill · Component', 'Button', 'Buttons trigger actions.')
  assert.deepEqual(head.children.map((node) => node.text), ['Quill · Component', 'Button', 'Buttons trigger actions.'])
  assert.equal(head.children[2].style.width, '720px')
  const html = serialize(section('All Variants'))
  assert.match(html, /^<div layer-name="All Variants" style="display:flex;flex-direction:column;align-items:flex-start;gap:var\(--spacing-4\)"><span style="[^"]*font-weight:var\(--font-weight-semibold\)[^"]*">All Variants<\/span><\/div>$/)
  // nothing on a page is a typed colour or size: literals would not follow a token change
  assert.equal(/#[0-9A-Fa-f]{6}/.test(serialize(head) + html), false)
})

test('the Foundations page is drawn from the tokens: every swatch is a var, every caption a value', () => {
  const nodes = foundationsPage()
  assert.deepEqual(nodes.map((node) => node.name), ['Header', 'Surfaces and text', 'Roles', 'Pigments', 'AI gradient', 'Data series', 'Type', 'Spacing', 'Radius'])
  const html = nodes.map((node) => serialize(node)).join('')
  assert.match(html, /background-color:var\(--color-card\)/)
  assert.match(html, /paper-warm · #EFE4CE/)
  assert.match(html, /linear-gradient\(90deg, var\(--color-ai-from\), var\(--color-ai-via\) 50%, var\(--color-ai-to\)\)/)
  assert.match(html, /text-sm · Raleway 13\.6px \/ 19\.4px/)
  assert.equal(/style="[^"]*(?:margin|display:grid|display:inline)[^"]*"/.test(html), false, 'only what Paper accepts')
})

test('the record can be brought in line with the code without Paper', () => {
  const piece = (slug, kind, config = {}) => ({ slug, name: slug.toUpperCase(), kind, config })
  const pieces = [piece('a', 'component'), piece('renamed', 'component'), piece('new', 'block'), piece('no', 'block', { declined: 'nothing to draw' }), piece('back', 'block'), piece('nowno', 'block', { declined: 'retired' })]
  const state = { removed: [], pieces: [
    { slug: 'a', status: 'synced', stories: [{ id: 'c-a--default' }] },
    { slug: 'renamed', status: 'synced', page: '❖ RENAMED', pageId: 'p-1', artboardId: 'r-0', stories: [{ id: 'c-r--default' }, { id: 'c-r--old-name' }] },
    { slug: 'gone', name: 'Gone', status: 'synced', page: '❖ Gone', artboardId: 'g-0', stories: [] },
    { slug: 'back', status: 'declined', reason: 'was nothing to draw' },
    { slug: 'nowno', name: 'NOWNO', status: 'synced', page: '◆ NOWNO', artboardId: 'n-0', stories: [] },
  ] }
  const { state: next, changes } = reconcile(state, pieces, new Set(['c-a--default', 'c-r--default']), '2026-10-08')
  const by = Object.fromEntries(next.pieces.map((entry) => [entry.slug, entry]))
  assert.deepEqual(by.a, state.pieces[0], 'an entry that is fine is not touched')
  // a renamed story: dropped, piece waits; its page and artboard stay so the next sync redraws in place
  assert.deepEqual([by.renamed.status, by.renamed.stories.map((story) => story.id), by.renamed.artboardId], ['pending', ['c-r--default'], 'r-0'])
  assert.equal('gone' in by, false)
  assert.deepEqual(by.new, { slug: 'new', name: 'NEW', kind: 'block', status: 'pending', page: '◆ NEW' })
  assert.deepEqual(by.no, { slug: 'no', name: 'NO', kind: 'block', status: 'declined', reason: 'nothing to draw' })
  assert.deepEqual(by.back, { slug: 'back', name: 'BACK', kind: 'block', status: 'pending', page: '◆ BACK' })
  assert.deepEqual(by.nowno, { slug: 'nowno', name: 'NOWNO', kind: 'block', status: 'declined', reason: 'retired' })
  // nothing is deleted here: the drawings of the removed and the newly declined piece are queued for the next sync
  assert.deepEqual(next.removed, [
    { slug: 'gone', page: '❖ Gone', artboard: 'pending', artboardId: 'g-0', name: 'Gone', at: '2026-10-08' },
    { slug: 'nowno', page: '◆ NOWNO', artboard: 'pending', artboardId: 'n-0', name: 'NOWNO', at: '2026-10-08' },
  ])
  assert.equal(changes.length, 6)
  assert.deepEqual(reconcile(next, pieces, new Set(['c-a--default', 'c-r--default'])).changes, [], 'running it again changes nothing')
})
