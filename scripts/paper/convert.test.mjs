import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BREAK, convertTree, createBinder, dropDefaults, normalizeText, planGrid, rotationOf, serialize, shorthand, translateMargins, visibleShadows, visibleTexts } from './convert.mjs'
import { resolveTokens } from './tokens.mjs'

// A small token table in the shape the real one has (names as Paper holds them).
const TABLE = resolveTokens([
  { name: '--color-background', type: 'color', value: 'var(--color-paper)' },
  { name: '--color-foreground', type: 'color', value: 'var(--color-ink)' },
  { name: '--color-card', type: 'color', value: 'var(--color-paper-warm)' },
  { name: '--color-popover', type: 'color', value: 'var(--color-paper-warm)' },
  { name: '--color-primary', type: 'color', value: 'var(--color-ink)' },
  { name: '--color-primary-foreground', type: 'color', value: 'var(--color-paper)' },
  { name: '--color-muted-foreground', type: 'color', value: 'var(--color-ink-muted)' },
  { name: '--color-destructive', type: 'color', value: 'var(--color-terracotta-deep)' },
  { name: '--color-border', type: 'color', value: 'var(--color-line-soft)' },
  { name: '--color-paper', type: 'color', value: '#F5EDDD' },
  { name: '--color-paper-warm', type: 'color', value: '#EFE4CE' },
  { name: '--color-ink', type: 'color', value: '#2A2622' },
  { name: '--color-ink-muted', type: 'color', value: '#675F58' },
  { name: '--color-terracotta-deep', type: 'color', value: '#8A4530' },
  { name: '--color-line-soft', type: 'color', value: 'rgba(42, 38, 34, 0.12)' },
  { name: '--font-sans', type: 'fontFamily', value: 'Raleway' },
  { name: '--font-heading', type: 'fontFamily', value: 'Fraunces' },
  { name: '--font-display', type: 'fontFamily', value: 'Fraunces' },
  { name: '--text-xs', type: 'fontSize', value: '12px' },
  { name: '--text-sm', type: 'fontSize', value: '13.6px' },
  { name: '--font-weight-medium', type: 'fontWeight', value: 500 },
  { name: '--leading-text-xs', type: 'lineHeight', value: 1.333333 },
  { name: '--leading-text-sm', type: 'lineHeight', value: 1.428571 },
  { name: '--leading-ui', type: 'lineHeight', value: 1.5 },
  { name: '--tracking-label', type: 'letterSpacing', value: '0.1em' },
  { name: '--spacing-1_5', type: 'spacing', value: '6px' },
  { name: '--spacing-3', type: 'spacing', value: '12px' },
  { name: '--spacing-4', type: 'spacing', value: '16px' },
  { name: '--radius-lg', type: 'radius', value: '8px' },
  { name: '--radius', type: 'radius', value: '8px' },
  { name: '--radius-xl', type: 'radius', value: '16px' },
])

// ------------------------------------------------------------------ style diffing

test('declarations equal to their default are dropped; the rest keep their order', () => {
  const kept = dropDefaults({ display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'nowrap', 'align-items': 'center', gap: '0px', padding: '0px', opacity: '1', 'font-style': 'normal', 'letter-spacing': 'normal', color: 'var(--color-foreground)', width: 'auto', 'flex-shrink': '0', 'min-width': '0px', height: undefined, top: '' })
  assert.deepEqual(Object.entries(kept), [['display', 'flex'], ['align-items', 'center'], ['color', 'var(--color-foreground)'], ['flex-shrink', '0'], ['min-width', '0px']])
})

test('four sides collapse to the shortest shorthand', () => {
  assert.equal(shorthand(['1px', '1px', '1px', '1px']), '1px')
  assert.equal(shorthand(['0px', '10px', '0px', '10px']), '0px 10px')
  assert.equal(shorthand(['10px', '10px', '4px', '10px']), '10px 10px 4px 10px')
})

test('Tailwind\'s invisible shadow layers are removed and the colours shortened', () => {
  const computed = 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(42, 38, 34, 0.14) 0px 2px 4px -1px, rgba(42, 38, 34, 0.08) 0px 1px 2px -1px'
  assert.equal(visibleShadows(computed), 'rgba(42, 38, 34, 0.14) 0px 2px 4px -1px, rgba(42, 38, 34, 0.08) 0px 1px 2px -1px')
  assert.equal(visibleShadows('rgba(0, 0, 0, 0) 0px 0px 0px 0px'), 'none')
  assert.equal(visibleShadows('rgb(76, 89, 54) 0px 0px 0px 3px'), '#4C5936 0px 0px 0px 3px')
})

test('text collapses the way white-space says', () => {
  assert.equal(normalizeText('  of\n   5,000 '), ' of 5,000 ')
  assert.equal(normalizeText('a\n  b', 'pre-wrap'), 'a\n  b')
})

// ------------------------------------------------------------------ margins

const none = { top: 0, right: 0, bottom: 0, left: 0 }
const child = (margin) => ({ margin: { ...none, ...margin } })

test('a margin on the outer edge of the first or last child becomes parent padding', () => {
  const moved = translateMargins({ axis: 'row', gap: 0 }, [child({ left: 4 }), child({}), child({ right: 3 })])
  assert.deepEqual(moved.padding, { top: 0, right: 3, bottom: 0, left: 4 })
  assert.deepEqual(moved.spacers, [])
  assert.deepEqual(moved.lost, [])
})

test('a margin between siblings becomes a spacer, shortened by the gap it adds', () => {
  // mb-1.5 (6px) in a column with a 2px gap: gap + spacer + gap must equal gap + margin
  const moved = translateMargins({ axis: 'column', gap: 2 }, [child({ bottom: 6 }), child({})])
  assert.deepEqual(moved.spacers, [{ before: 1, size: 4 }])
  assert.deepEqual(moved.padding, none)
})

test('flex margins add up; block margins collapse to the larger', () => {
  const pair = [child({ bottom: 8 }), child({ top: 12 })]
  assert.deepEqual(translateMargins({ axis: 'column' }, pair).spacers, [{ before: 1, size: 20 }])
  assert.deepEqual(translateMargins({ axis: 'column', collapse: true }, pair).spacers, [{ before: 1, size: 12 }])
})

test('an auto margin names the child it pushes, so the caller can grow a wrapper instead of adding a gap', () => {
  assert.deepEqual(translateMargins({ axis: 'row', gap: 8 }, [child({}), child({ left: 'auto' })]).spacers, [{ before: 1, grow: true, of: 1, edge: 'left' }])
  assert.deepEqual(translateMargins({ axis: 'row' }, [child({ left: 'auto' })]).spacers, [{ before: 0, grow: true, of: 0, edge: 'left' }])
  assert.deepEqual(translateMargins({ axis: 'row' }, [child({ right: 'auto' }), child({})]).spacers, [{ before: 1, grow: true, of: 0, edge: 'right' }])
  // a card footer with mt-auto in a column whose gap is 16px: no extra layer between content and footer
  const part = (name, spec = {}) => el('div', { slot: name, used: { display: 'flex' }, spec, children: [el('p', { children: [{ text: name }] })] })
  const { root } = convertTree(el('div', { used: { display: 'flex', flexDirection: 'column', rowGap: '16px', columnGap: '16px' }, children: [part('card-content'), part('card-footer', { marginTop: 'auto' })] }), TABLE)
  assert.deepEqual(root.children.map((node) => node.name), ['card-content', 'push'])
  assert.deepEqual([root.children[1].style['flex-grow'], root.children[1].style['justify-content'], root.children[1].children[0].name], ['1', 'flex-end', 'card-footer'])
})

test('a transform is read as the rotation Paper can hold, plus whether anything else was in it', () => {
  assert.deepEqual(rotationOf('none'), { degrees: 0, other: false })
  assert.deepEqual(rotationOf('matrix(0, 1, -1, 0, 0, 0)'), { degrees: 90, other: false })
  assert.deepEqual(rotationOf('matrix(1, 0, 0, 1, 0, -4)'), { degrees: 0, other: true })
  assert.equal(rotationOf('matrix(0.5, 0, 0, 0.5, 0, 0)').other, true)
})

test('what cannot be carried is reported, not guessed', () => {
  const moved = translateMargins({ axis: 'row', gap: 8 }, [child({ right: 4, top: 6 }), child({ left: -6 })])
  assert.deepEqual(moved.spacers, [])
  assert.equal(moved.negative, true)
  assert.equal(moved.lost.length, 1)
  assert.match(moved.lost.join('|'), /negative left margin \(-6px\) dropped/)
})

test('a margin across the row (a Retry button nudged down 4px beside its text) pads a frame around the child', () => {
  assert.deepEqual(translateMargins({ axis: 'row', gap: 4 }, [child({}), child({ top: 4 })]).wraps, [{ index: 1, side: 'top', size: 4 }])
  const retry = el('button', { slot: 'button', used: { display: 'flex' }, spec: { marginTop: '4px', height: '24px' }, children: [el('p', { children: [{ text: 'Retry' }] })] })
  const { root } = convertTree(el('div', { used: { display: 'flex', alignItems: 'flex-start' }, children: [el('p', { children: [{ text: 'Couldn\'t open' }] }), retry] }), TABLE)
  assert.deepEqual([root.children[1].name, root.children[1].style['padding-top'], root.children[1].children[0].name], ['margin', '4px', 'button'])
  // a growing child keeps growing: the frame takes its place in the row
  const grows = el('p', { used: { display: 'block', flexGrow: '1', alignSelf: 'center' }, spec: { marginTop: '2px' }, children: [{ text: 'label' }] })
  const wrapped = convertTree(el('div', { used: { display: 'flex' }, children: [grows] }), TABLE).root.children[0]
  assert.deepEqual([wrapped.name, wrapped.style['flex-grow'], wrapped.style['align-self'], wrapped.children[0].style['align-self']], ['margin', '1', 'center', undefined])
})

test('a margin smaller than the gap wraps each child in its own padding instead of a spacer', () => {
  // a separator with my-2 (8px) in a column whose gap is 16px
  const moved = translateMargins({ axis: 'column', gap: 16 }, [child({}), child({ top: 8, bottom: 8 }), child({})])
  assert.deepEqual(moved.spacers, [])
  assert.deepEqual(moved.wraps, [{ index: 1, side: 'top', size: 8 }, { index: 1, side: 'bottom', size: 8 }])
  const row = (margin) => el('div', { used: { display: 'flex' }, spec: margin, children: [el('p', { children: [{ text: 'x' }] })] })
  const { root } = convertTree(el('div', { used: { display: 'flex', flexDirection: 'column', rowGap: '16px', columnGap: '16px' }, children: [row({}), row({ marginTop: '8px', marginBottom: '8px' }), row({})] }), TABLE)
  assert.deepEqual(root.children.map((node) => node.name ?? 'row'), ['row', 'margin', 'row'])
  assert.deepEqual([root.children[1].style['padding-top'], root.children[1].style['padding-bottom']], ['8px', '8px'])
})

test('blocks and inline content in one container: blocks stack, inline runs share a line', () => {
  const label = el('p', { children: [{ text: 'Disabled' }] })
  const button = el('button', { used: { display: 'inline-flex' }, spec: { width: '32px', height: '32px' }, children: [{ text: 'B' }] })
  const { root } = convertTree(el('div', { children: [label, button, { text: ' and ' }, el('span', { used: { display: 'inline' }, children: [{ text: 'more' }] })] }), TABLE)
  assert.equal(root.style['flex-direction'], 'column')
  assert.deepEqual(root.children.map((node) => node.name ?? node.text), ['Disabled', 'line'])
  assert.deepEqual(root.children[1].children.map((node) => node.name ?? node.text), ['button', ' and ', 'more'])
})

test('a block\'s margin still spaces the lines when blocks and inline content are mixed', () => {
  const label = el('p', { spec: { marginBottom: '8px' }, children: [{ text: 'Disabled' }] })
  const toggle = el('button', { used: { display: 'inline-flex' }, spec: { width: '32px', height: '32px' }, children: [{ text: 'B' }] })
  const { root } = convertTree(el('div', { children: [label, toggle] }), TABLE)
  assert.deepEqual(root.children.map((node) => node.name ?? node.text), ['Disabled', 'spacer', 'button'])
  assert.equal(root.children[1].style.height, '8px')
})

// ------------------------------------------------------------------ grid

test('a one-column grid is a flex column with the row gap', () => {
  assert.deepEqual(planGrid({ columns: [348], rowGap: 12, columnGap: 12, children: [{ x: 0, y: 0, width: 348 }, { x: 0, y: 40, width: 348 }] }), { kind: 'column', gap: 12 })
})

test('a wider grid becomes rows of measured cells, grouped by the top edge the browser gave them', () => {
  // dl.grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1
  const plan = planGrid({ columns: [58.5, 373.5], columnGap: 12, rowGap: 4, children: [{ x: 0, y: 0, width: 58.5 }, { x: 70.5, y: 0, width: 373.5 }, { x: 0, y: 23.4, width: 58.5 }, { x: 70.5, y: 23.4, width: 373.5 }] })
  assert.equal(plan.kind, 'rows')
  assert.deepEqual([plan.rowGap, plan.columnGap], [4, 12])
  assert.deepEqual(plan.rows, [[{ index: 0, width: 58.5, offset: 0 }, { index: 1, width: 373.5, offset: 0 }], [{ index: 2, width: 58.5, offset: 0 }, { index: 3, width: 373.5, offset: 0 }]])
})

test('rows are read from the tracks, not the top edges: centred cells and a nudged icon stay in their row', () => {
  // an alert: icon | title, then the description under the title (the icon's track left empty)
  const plan = planGrid({ columns: [16, 338], columnGap: 8, rowGap: 2, children: [{ x: 0, y: 2, width: 16 }, { x: 24, y: 0, width: 338 }, { x: 24, y: 21.4, width: 338 }] })
  assert.deepEqual(plan.rows.map((row) => row.map((cell) => cell.index)), [[0, 1], [2]])
  assert.equal(plan.rows[1][0].offset, 24)
  // a row whose cells are centred on each other has three different tops
  const centred = planGrid({ columns: [100, 100, 100], columnGap: 0, children: [{ x: 0, y: 10, width: 100 }, { x: 100, y: 0, width: 100 }, { x: 200, y: 14, width: 100 }, { x: 0, y: 60, width: 100 }] })
  assert.deepEqual(centred.rows.map((row) => row.length), [3, 1])
})

test('a cell that skips a track is offset by the track it skipped', () => {
  const plan = planGrid({ columns: [100, 100, 100], columnGap: 10, children: [{ x: 0, y: 0, width: 100 }, { x: 220, y: 0, width: 100 }] })
  assert.deepEqual(plan.rows[0].map((cell) => cell.offset), [0, 110])
})

// ------------------------------------------------------------------ token matching

test('a colour binds to the token its class named, when that still explains the computed value', () => {
  const binder = createBinder(TABLE)
  // paper-warm is card AND popover: the class decides
  assert.equal(binder.color('background', 'rgb(239, 228, 206)', ['rounded-xl', 'bg-popover']), 'var(--color-popover)')
  assert.equal(binder.color('background', 'rgb(239, 228, 206)', ['bg-card']), 'var(--color-card)')
  // a class that no longer matches the computed colour (overridden elsewhere) is not trusted
  assert.equal(binder.color('background', 'rgb(245, 237, 221)', ['bg-card']), 'var(--color-background)')
  // variant classes (hover:, dark:) say nothing about the resting state
  assert.equal(binder.color('background', 'rgb(245, 237, 221)', ['hover:bg-card', 'dark:bg-popover']), 'var(--color-background)')
})

test('without a class, semantic roles win over the raw palette, by what the property is for', () => {
  const binder = createBinder(TABLE)
  assert.equal(binder.color('text', 'rgb(42, 38, 34)'), 'var(--color-foreground)')
  assert.equal(binder.color('background', 'rgb(42, 38, 34)'), 'var(--color-primary)')
  assert.equal(binder.color('border', 'rgba(42, 38, 34, 0.12)'), 'var(--color-border)')
  assert.equal(binder.color('text', 'rgb(245, 237, 221)'), 'var(--color-primary-foreground)')
})

test('an opacity modifier binds as a token tint, from the class or from the alpha', () => {
  const binder = createBinder(TABLE)
  // bg-destructive/10 computes to the token at 10 % alpha (Chrome reports it in OKLab)
  assert.equal(binder.color('background', 'rgba(138, 69, 48, 0.1)', ['bg-destructive/10']), 'color-mix(in oklab, var(--color-destructive) 10%, transparent)')
  assert.equal(binder.color('background', 'rgba(138, 69, 48, 0.2)'), 'color-mix(in oklab, var(--color-destructive) 20%, transparent)')
})

test('a colour no token holds stays a literal and is counted against the binding rate', () => {
  const binder = createBinder(TABLE)
  assert.equal(binder.color('background', 'rgb(217, 205, 179)'), '#D9CDB3')
  assert.equal(binder.color('background', 'rgba(0, 0, 0, 0)'), 'transparent')
  assert.deepEqual([binder.stats.bound, binder.stats.bindable], [0, 1])
  assert.deepEqual(binder.stats.unbound, { 'background #D9CDB3': 1 })
})

test('sizes, radius, type and tracking bind by value; off-scale values stay px', () => {
  const binder = createBinder(TABLE)
  assert.equal(binder.length('spacing', 12), 'var(--spacing-3)')
  assert.equal(binder.length('spacing', 9), '9px')
  assert.equal(binder.length('spacing', 0), '0px')
  assert.equal(binder.length('radius', 8), 'var(--radius-lg)', 'a named step beats the bare --radius')
  assert.equal(binder.length('radius', 16, { classes: ['rounded-xl'] }), 'var(--radius-xl)')
  assert.equal(binder.fontSize(13.6), 'var(--text-sm)')
  assert.equal(binder.fontWeight('500'), 'var(--font-weight-medium)')
  assert.equal(binder.fontFamily('Raleway, -apple-system, "system-ui", sans-serif'), 'var(--font-sans)')
  assert.equal(binder.fontFamily('Fraunces, Georgia, serif'), 'var(--font-heading)')
  assert.equal(binder.letterSpacing(1.2, 12), 'var(--tracking-label)')
  assert.deepEqual([binder.stats.bound, binder.stats.bindable], [8, 9])
})

test('a line height binds to the one that ships with its size, else to a role, else stays px', () => {
  const binder = createBinder(TABLE)
  assert.equal(binder.lineHeight(19.4286, 13.6), 'var(--leading-text-sm)')
  assert.equal(binder.lineHeight(16, 12), 'var(--leading-text-xs)')
  assert.equal(binder.lineHeight(24, 16), 'var(--leading-ui)')
  assert.equal(binder.lineHeight(18.2857, 12.8), '18.29px')
})

test('colours inside a gradient bind where they are exactly a token', () => {
  const binder = createBinder(TABLE)
  assert.equal(binder.colorsIn('linear-gradient(90deg, rgb(138, 69, 48), rgb(1, 2, 3) 50%)'), 'linear-gradient(90deg, var(--color-destructive), #010203 50%)')
})

test('a gradient that fades out fades its own colour, not black (Paper blends through the see-through stop\'s colour)', () => {
  const binder = createBinder(TABLE)
  // the AI wash and glow fade to `transparent`, which the browser reports as see-through black
  assert.equal(binder.colorsIn('linear-gradient(rgba(196, 149, 68, 0.12) 0%, rgba(0, 0, 0, 0) 100%)'), 'linear-gradient(rgba(196, 149, 68, 0.12) 0%, rgba(196, 149, 68, 0) 100%)')
  assert.equal(binder.colorsIn('radial-gradient(60% 70% at 30% 40%, rgba(0, 0, 0, 0), rgb(83, 106, 153) 70%)'), 'radial-gradient(60% 70% at 30% 40%, rgba(83, 106, 153, 0), #536A99 70%)')
})

// ------------------------------------------------------------------ the whole conversion, on a captured tree

const USED = { display: 'block', position: 'static', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'normal', justifyContent: 'normal', alignSelf: 'auto', alignContent: 'normal', justifyItems: 'normal', flexGrow: '0', flexShrink: '1', columnGap: 'normal', rowGap: 'normal', gridTemplateColumns: 'none',
  paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', overflowX: 'visible', overflowY: 'visible', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', backgroundClip: 'border-box',
  borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px', borderTopStyle: 'none', borderRightStyle: 'none', borderBottomStyle: 'none', borderLeftStyle: 'none', borderTopColor: 'rgb(0, 0, 0)', borderRightColor: 'rgb(0, 0, 0)', borderBottomColor: 'rgb(0, 0, 0)', borderLeftColor: 'rgb(0, 0, 0)',
  borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', boxShadow: 'none', opacity: '1', outlineStyle: 'none', outlineWidth: '0px', outlineColor: 'rgb(0, 0, 0)', outlineOffset: '0px',
  fontFamily: 'Raleway, sans-serif', fontSize: '13.6px', fontWeight: '400', fontStyle: 'normal', lineHeight: '19.4286px', letterSpacing: 'normal', color: 'rgb(42, 38, 34)', textAlign: 'start', whiteSpace: 'normal', textTransform: 'none', textDecorationLine: 'none', textOverflow: 'clip', fontVariationSettings: 'normal', fontVariantNumeric: 'normal',
  verticalAlign: 'baseline', transform: 'none', zIndex: 'auto', clipPath: 'none', maskImage: 'none', filter: 'none', backdropFilter: 'none' }
const SPEC = { width: 'auto', height: 'auto', minWidth: 'auto', maxWidth: 'none', minHeight: 'auto', maxHeight: 'none', flexBasis: 'auto', marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px', top: 'auto', right: 'auto', bottom: 'auto', left: 'auto', gridTemplateRows: 'none' }
const el = (tag, { used = {}, spec = {}, rect = { x: 0, y: 0, w: 100, h: 20 }, classes = [], slot = null, role = null, children = [] } = {}) => ({ tag, slot, role, classes, used: { ...USED, ...used }, spec: { ...SPEC, ...spec }, rect, children, pseudo: [] })
const border = (color) => ({ borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px', borderTopStyle: 'solid', borderRightStyle: 'solid', borderBottomStyle: 'solid', borderLeftStyle: 'solid', borderTopColor: color, borderRightColor: color, borderBottomColor: color, borderLeftColor: color })
const radius = (value) => ({ borderTopLeftRadius: value, borderTopRightRadius: value, borderBottomRightRadius: value, borderBottomLeftRadius: value })
const padding = (value) => ({ paddingTop: value, paddingRight: value, paddingBottom: value, paddingLeft: value })

test('a card: grid → flex column, tokens bound, layers named, the label a single text layer', () => {
  const tree = el('div', {
    slot: 'usage-meter',
    classes: ['grid', 'gap-3', 'rounded-xl', 'border', 'border-border', 'bg-card', 'p-4'],
    used: { display: 'grid', gridTemplateColumns: '346px', rowGap: '12px', columnGap: '12px', backgroundColor: 'rgb(239, 228, 206)', ...border('rgba(42, 38, 34, 0.12)'), ...radius('16px'), ...padding('16px') },
    spec: { width: '380px' },
    rect: { x: 0, y: 0, w: 380, h: 120 },
    children: [
      el('p', { classes: ['font-medium', 'text-foreground'], used: { fontWeight: '500' }, rect: { x: 17, y: 17, w: 346, h: 19.4 }, children: [{ text: '\n  AI credits ' }] }),
      el('p', { classes: ['text-xs', 'text-muted-foreground'], used: { fontSize: '12px', lineHeight: '16px', color: 'rgb(103, 95, 88)' }, rect: { x: 17, y: 48, w: 346, h: 16 }, children: [{ text: 'Renews 1 November' }] }),
    ],
  })
  const { root, stats } = convertTree(tree, TABLE)
  assert.equal(serialize(root), '<div layer-name="usage-meter" style="display:flex;flex-direction:column;gap:var(--spacing-3);background-color:var(--color-card);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--spacing-4);width:380px">'
    + '<span style="font-family:var(--font-sans);font-size:var(--text-sm);font-weight:var(--font-weight-medium);line-height:var(--leading-text-sm);color:var(--color-foreground)">AI credits</span>'
    + '<span style="font-family:var(--font-sans);font-size:var(--text-xs);line-height:var(--leading-text-xs);color:var(--color-muted-foreground)">Renews 1 November</span></div>')
  assert.equal(stats.nodes, 3)
  assert.equal(stats.approximated, 0)
  assert.equal(stats.bindingRate, 1)
  assert.deepEqual(visibleTexts(tree), ['AI credits', 'Renews 1 November'])
})

test('a button: text inside a flex box becomes its own layer beside the icon; the icon takes the text colour\'s token', () => {
  const tree = el('button', {
    slot: 'button',
    classes: ['inline-flex', 'bg-primary', 'text-primary-foreground', 'rounded-lg'],
    used: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', columnGap: '6px', rowGap: '6px', backgroundColor: 'rgb(42, 38, 34)', color: 'rgb(245, 237, 221)', fontWeight: '500', whiteSpace: 'nowrap', ...radius('8px'), paddingLeft: '10px', paddingRight: '10px' },
    spec: { height: '32px' },
    rect: { x: 0, y: 0, w: 110, h: 32 },
    children: [
      { ...el('svg', { slot: 'icon', used: { display: 'inline-block', color: 'rgb(245, 237, 221)', flexShrink: '0' }, spec: { width: '16px', height: '16px' }, rect: { x: 10, y: 8, w: 16, h: 16 } }), svg: '<svg viewBox="0 -960 960 960" width="16" height="16"><path d="M0 0h1v1z" fill="currentColor"></path></svg>' },
      { text: 'Send email' },
    ],
  })
  const html = serialize(convertTree(tree, TABLE).root)
  assert.match(html, /^<div layer-name="button" style="display:flex;align-items:center;justify-content:center;gap:var\(--spacing-1_5\);background-color:var\(--color-primary\);border-radius:var\(--radius-lg\);padding:0px 10px;height:32px">/)
  assert.match(html, /<svg layer-name="icon" style="width:16px;height:16px;flex-shrink:0" viewBox="0 -960 960 960" width="16" height="16"><path d="M0 0h1v1z" fill="var\(--color-primary-foreground\)"><\/path><\/svg>/)
  assert.match(html, /<span style="[^"]*font-weight:var\(--font-weight-medium\)[^"]*color:var\(--color-primary-foreground\);white-space:nowrap">Send email<\/span><\/div>$/)
})

test('rich text is split into one-style runs on a baseline, keeps its space, and is counted as approximated', () => {
  const tree = el('span', { children: [el('span', { used: { display: 'inline', fontWeight: '600' }, children: [{ text: '1,500' }] }), { text: ' left' }] })
  const { root, stats } = convertTree(tree, TABLE)
  assert.equal(root.style['align-items'], 'baseline')
  assert.deepEqual(root.children.map((node) => node.text), ['1,500', ' left'])
  assert.equal(root.children[1].style['white-space'], 'pre-wrap')
  assert.equal(stats.approximated, 1)
  assert.match(stats.approximations[0].reasons[0], /rich text split into 2 one-style runs/)
})

test('a two-column grid and a table row keep measured widths and say so', () => {
  const cell = (x, y, w, text) => el('dd', { rect: { x, y, w, h: 19 }, children: [{ text }] })
  const grid = el('dl', { used: { display: 'grid', gridTemplateColumns: '58.5px 373.5px', columnGap: '12px', rowGap: '4px' }, rect: { x: 0, y: 0, w: 444, h: 42 }, children: [cell(0, 0, 58.5, 'To:'), cell(70.5, 0, 373.5, 'growth@example.com'), cell(0, 23, 58.5, 'Subject:'), cell(70.5, 23, 373.5, 'September signups')] })
  const { root, stats } = convertTree(grid, TABLE)
  assert.deepEqual(root.children.map((row) => row.name), ['row', 'row'])
  assert.equal(root.children[0].style.gap, 'var(--spacing-3)')
  assert.deepEqual(root.children[0].children.map((node) => node.style.width), ['58.5px', '373.5px'])
  assert.match(stats.approximations[0].reasons[0], /2-column grid drawn as flex rows/)

  const row = el('tr', { used: { display: 'table-row' }, children: [el('th', { used: { display: 'table-cell', ...padding('6px') }, rect: { x: 0, y: 0, w: 246.28, h: 28 }, children: [{ text: 'Chat answers' }] }), el('td', { used: { display: 'table-cell', textAlign: 'right', ...padding('6px') }, rect: { x: 246.28, y: 0, w: 99.72, h: 28 }, children: [{ text: '2,400' }] })] })
  const converted = convertTree(row, TABLE)
  assert.deepEqual(converted.root.children.map((node) => [node.name, node.style.width, node.style['flex-shrink']]), [['th', '246.28px', '0'], ['td', '99.72px', '0']])
  assert.equal(converted.root.children[1].children[0].style['text-align'], 'right')
  assert.equal(converted.stats.approximated, 1)
})

test('margins move to the parent: outer edge to padding, between siblings to a spacer', () => {
  const tree = el('nav', { used: { display: 'grid', gridTemplateColumns: '282px', rowGap: '2px', columnGap: '2px' }, children: [
    el('button', { spec: { marginBottom: '6px' }, used: { display: 'inline-flex' }, children: [{ text: 'New chat' }] }),
    el('li', { used: { display: 'flex', alignItems: 'center' }, children: [el('button', { used: { display: 'block', flexGrow: '1' }, children: [{ text: 'Weekly review' }] }), el('button', { spec: { marginRight: '3px', width: '24px', height: '24px' }, used: { display: 'inline-flex', flexShrink: '0' } })] }),
  ] })
  const { root } = convertTree(tree, TABLE)
  assert.deepEqual(root.children.map((node) => node.name), ['button', 'spacer', 'li'])
  assert.equal(root.children[1].style.height, '4px')
  assert.equal(root.children[2].style.padding, '0px 3px 0px 0px')
})

test('what Paper cannot draw is listed as lost; a rotation and a blur are kept', () => {
  const scaled = el('div', { used: { display: 'flex', transform: 'matrix(0.5, 0, 0, 0.5, 0, -4)', maskImage: 'linear-gradient(black, transparent)' }, children: [el('p', { children: [{ text: 'x' }] })] })
  const turned = el('div', { used: { display: 'flex', transform: 'matrix(-1, 0, 0, -1, 0, 0)', filter: 'blur(2px)' }, spec: { width: '16px', height: '16px' }, children: [] })
  const arrow = el('div', { used: { display: 'flex', rotate: '45deg' }, spec: { width: '10px', height: '10px' }, children: [] })
  const { root, stats } = convertTree(el('div', { used: { display: 'flex', transform: 'matrix(1, 0, 0, 1, -50, -50)' }, children: [scaled, turned, arrow] }), TABLE)
  assert.equal(stats.lost.length, 2, 'the root\'s own translate only places it on the page')
  assert.match(stats.lost.join('|'), /transform not carried/)
  assert.match(stats.lost.join('|'), /mask not carried/)
  assert.deepEqual([root.children[1].style.rotate, root.children[1].style.filter, root.children[2].style.rotate], ['180deg', 'blur(2px)', '45deg'])
})

test('an out-of-flow child is placed where the browser measured it, inside its parent; z-index becomes layer order', () => {
  const badge = el('span', { used: { position: 'absolute', display: 'block', zIndex: '2', backgroundColor: 'rgb(42, 38, 34)' }, spec: { right: '-2px', bottom: '-2px' }, rect: { x: 31, y: 31, w: 10, h: 10 } })
  const under = el('span', { used: { position: 'absolute', display: 'block', zIndex: '-1', backgroundColor: 'rgb(239, 228, 206)' }, rect: { x: 0, y: 0, w: 40, h: 40 } })
  const photo = el('p', { rect: { x: 1, y: 1, w: 38, h: 38 }, children: [{ text: 'RP' }] })
  const { root } = convertTree(el('div', { used: { display: 'flex', ...border('rgb(0, 0, 0)') }, rect: { x: 0, y: 0, w: 40, h: 40 }, children: [badge, photo, under] }), TABLE)
  assert.equal(root.style.position, 'relative')
  assert.deepEqual(root.children.map((node) => node.style.position ?? 'flow'), ['absolute', 'flow', 'absolute'], 'a negative z-index goes underneath, the rest on top')
  assert.deepEqual([root.children[2].style.left, root.children[2].style.top, root.children[2].style.width], ['30px', '30px', '10px'], 'measured from inside the parent\'s border')
})

test('overlapping children (negative margins) are traced by position; mx-auto becomes align-self', () => {
  const avatar = (x, margin) => el('span', { used: { display: 'flex' }, spec: { width: '32px', height: '32px', marginLeft: margin }, rect: { x, y: 0, w: 32, h: 32 } })
  const group = el('div', { used: { display: 'flex' }, rect: { x: 0, y: 0, w: 80, h: 32 }, children: [avatar(0, '0px'), avatar(24, '-8px'), avatar(48, '-8px')] })
  const { root, stats } = convertTree(group, TABLE)
  assert.deepEqual(root.children.map((node) => [node.style.position, node.style.left]), [['absolute', '0px'], ['absolute', '24px'], ['absolute', '48px']])
  assert.deepEqual([root.style.position, root.style.width, root.style.height], ['relative', '80px', '32px'])
  assert.match(stats.approximations[0].reasons[0], /children overlap/)
  const centred = el('div', { used: { display: 'flex', flexDirection: 'column' }, children: [el('div', { used: { display: 'flex' }, spec: { width: '200px', marginLeft: 'auto', marginRight: 'auto' }, children: [el('p', { children: [{ text: 'x' }] })] })] })
  assert.equal(convertTree(centred, TABLE).root.children[0].style['align-self'], 'center')
})

test('form fields, line breaks, pictures and media', () => {
  const input = { ...el('input', { used: { display: 'block', ...border('rgb(138, 127, 110)'), ...radius('8px'), paddingLeft: '10px', paddingRight: '10px' }, rect: { x: 0, y: 0, w: 240, h: 32 } }), value: '', placeholder: 'you@example.com', placeholderColor: 'rgb(103, 95, 88)' }
  const checkbox = { ...el('input', { used: { display: 'block' }, rect: { x: 0, y: 0, w: 16, h: 16 } }), value: 'on', textless: true }
  const lines = el('p', { children: [{ text: `Line one${BREAK}  line two` }] })
  const photo = { ...el('img', { used: { display: 'block', objectFit: 'cover', ...radius('3.35544e+07px') }, rect: { x: 0, y: 0, w: 40, h: 40 } }), src: 'https://example.com/a.png', alt: 'Ada' }
  const broken = { ...el('img', { used: { display: 'block' }, rect: { x: 0, y: 0, w: 40, h: 40 } }), src: 'https://example.com/missing.png', alt: '' }
  const video = el('video', { rect: { x: 0, y: 0, w: 320, h: 180 } })
  const tree = el('div', { used: { display: 'flex', flexDirection: 'column' }, children: [input, checkbox, lines, photo, broken, video] })
  const { root, stats } = convertTree(tree, TABLE, { images: { 'https://example.com/a.png': 'data:image/png;base64,AAAA' } })
  const [field, box, paragraph, picture, placeholder, media] = root.children
  assert.deepEqual([field.name, field.style.width, field.style.height, field.children[0].text, field.children[0].style.color], ['input', '240px', '32px', 'you@example.com', 'var(--color-muted-foreground)'])
  assert.equal(box.children.length, 0, 'a checkbox has no text of its own')
  assert.equal(paragraph.text, 'Line one\nline two')
  assert.match(picture.raw, /^<img layer-name="Ada" src="data:image\/png;base64,AAAA" style="border-radius:9999px;width:40px;height:40px;flex-shrink:0;object-fit:cover">$/)
  assert.deepEqual([placeholder.name, media.name], ['img (placeholder)', 'video (placeholder)'])
  assert.equal(stats.lost.length, 2)
  assert.deepEqual(visibleTexts(tree), ['you@example.com', 'Line one line two'])
})

test('text and attributes are escaped', () => {
  const tree = el('p', { children: [{ text: 'Q3 <signups> & "target"' }] })
  assert.match(serialize(convertTree(tree, TABLE).root), />Q3 &lt;signups&gt; &amp; "target"<\/span>$/)
  const named = el('div', { slot: 'a"b', used: { display: 'flex' }, children: [el('p', { children: [{ text: 'x' }] })] })
  assert.match(serialize(convertTree(named, TABLE).root), /layer-name="a&quot;b"/)
})

test('a gradient wider than its box becomes a clipped child layer (Paper drops background-size)', () => {
  const fill = el('div', { slot: 'progress-indicator', used: { display: 'block', backgroundImage: 'linear-gradient(90deg, rgb(138, 69, 48), rgb(1, 2, 3))', backgroundSize: '333.333% 100%', backgroundRepeat: 'no-repeat', backgroundPosition: '0% 0%', ...radius('3.35544e+07px') }, spec: { width: '30%', height: '6px' }, rect: { x: 0, y: 0, w: 104, h: 6 } })
  const { root, stats } = convertTree(el('div', { used: { display: 'flex' }, spec: { width: '346px' }, children: [fill] }), TABLE)
  const indicator = root.children[0]
  assert.equal(indicator.style['background-image'], undefined)
  assert.deepEqual([indicator.style.overflow, indicator.style.position, indicator.style.width, indicator.style['border-radius']], ['hidden', 'relative', '30%', '9999px'])
  assert.deepEqual(indicator.children.map((child) => [child.name, child.style.position, child.style.width, child.style.height]), [['gradient', 'absolute', '333.33%', '100%']])
  assert.equal(indicator.children[0].style['background-image'], 'linear-gradient(90deg, var(--color-destructive), #010203)')
  assert.match(stats.approximations[0].reasons[0], /background-size is not kept by Paper/)
})

test('a fully transparent element holds its place in flow and is left out when it floats', () => {
  const more = el('button', { slot: 'dropdown-menu-trigger', used: { display: 'inline-flex', opacity: '0', flexShrink: '0' }, spec: { width: '24px', height: '24px' }, rect: { x: 270, y: 4, w: 24, h: 24 }, children: [{ text: 'More' }] })
  const ghost = el('div', { used: { position: 'absolute', opacity: '0', display: 'block' }, rect: { x: 0, y: 0, w: 31, h: 32 }, children: [{ text: 'Platform' }] })
  const row = el('li', { used: { display: 'flex', alignItems: 'center' }, children: [el('p', { used: { flexGrow: '1' }, children: [{ text: 'Launch brief draft' }] }), more, ghost] })
  const { root } = convertTree(row, TABLE)
  assert.deepEqual(root.children.map((node) => node.name ?? node.text), ['Launch brief draft', 'dropdown-menu-trigger (hidden)'])
  assert.deepEqual([root.children[1].style.width, root.children[1].style.height, root.children[1].children.length], ['24px', '24px', 0])
})

test('a percentage flex-basis in a column without a height is left out (the browser treats it as content height)', () => {
  const part = (basis) => el('div', { used: { display: 'flex', flexGrow: basis === '0%' ? '1' : '0' }, spec: { flexBasis: basis }, children: [el('p', { children: [{ text: 'x' }] })] })
  const column = convertTree(el('div', { used: { display: 'flex' }, children: [el('div', { slot: 'item', used: { display: 'flex', flexDirection: 'column' }, children: [part('100%'), part('0%')] })] }), TABLE).root.children[0]
  assert.deepEqual(column.children.map((node) => node.style['flex-basis']), [undefined, undefined])
  assert.equal(column.children[1].style['flex-grow'], '1')
  const row = convertTree(el('div', { used: { display: 'flex' }, children: [el('div', { used: { display: 'flex' }, children: [part('0%')] })] }), TABLE).root.children[0]
  assert.equal(row.children[0].style['flex-basis'], '0%', 'in a row the basis is a share of a real width')
})

test('a grid that only centres a label becomes one centred text layer, not a lost label', () => {
  const thumb = el('span', { classes: ['grid', 'place-items-center', 'bg-muted'], used: { display: 'grid', gridTemplateColumns: '32px', alignItems: 'center', justifyItems: 'center', backgroundColor: 'rgb(239, 228, 206)' }, spec: { width: '32px', height: '32px' }, children: [{ text: 'PDF' }] })
  const { root, stats } = convertTree(el('div', { used: { display: 'flex' }, children: [thumb] }), TABLE)
  assert.deepEqual([root.children[0].style['align-items'], root.children[0].style['justify-content'], root.children[0].children[0].text], ['center', 'center', 'PDF'])
  assert.deepEqual(stats.lost, [])
})

test('an ::after sits under in-flow children that are all positioned above it (a calendar range end)', () => {
  // the cell bridges into the range band with an ::after; the day button (z-10) covers it in the browser
  const cell = el('td', { used: { position: 'relative', zIndex: '0', backgroundColor: 'rgb(232, 220, 192)' }, rect: { x: 0, y: 0, w: 28, h: 28 }, children: [
    el('button', { slot: 'day', used: { position: 'relative', zIndex: '10', backgroundColor: 'rgb(42, 38, 34)' }, rect: { x: 0, y: 0, w: 28, h: 28 }, children: [{ text: '15' }] }),
  ] })
  cell.pseudo = [{ ...el('div', { used: { position: 'absolute', zIndex: 'auto', backgroundColor: 'rgb(232, 220, 192)', right: '0px' }, spec: { width: '16px' }, rect: { x: 12, y: 0, w: 16, h: 28 } }), which: 'after', content: '' }]
  const html = serialize(convertTree(cell, TABLE).root)
  assert.ok(html.indexOf('::after') < html.indexOf('15'), `the ::after must come before (under) the button: ${html}`)

  // with an in-flow child at the same level, the ::after still paints on top, as in the browser
  const plain = el('div', { used: { position: 'relative' }, children: [el('span', { used: { display: 'block' }, children: [{ text: 'label' }] })] })
  plain.pseudo = [{ ...el('div', { used: { position: 'absolute', backgroundColor: 'rgb(232, 220, 192)' }, spec: { width: '16px' }, rect: { x: 0, y: 0, w: 16, h: 20 } }), which: 'after', content: '' }]
  const plainHtml = serialize(convertTree(plain, TABLE).root)
  assert.ok(plainHtml.indexOf('::after') > plainHtml.indexOf('label'), `an ordinary ::after stays on top: ${plainHtml}`)
})

// ------------------------------------------------------------------ the AI kit's drawing (gradient edge, gradient text, turned icons)

const GOLD = 'rgb(196, 149, 68)'
const INDIGO = 'rgb(83, 106, 153)'
const PAPER = 'rgb(245, 237, 221)'

test('a gradient edge (a fill clipped to the padding box over a gradient on the border box) keeps its edge', () => {
  // `ai-edge`: border 1.5px transparent, background: <paper> padding-box, <gradient> border-box
  const composer = el('div', { slot: 'prompt-composer', used: { display: 'flex', flexDirection: 'column', backgroundImage: `linear-gradient(${PAPER}, ${PAPER}), linear-gradient(115deg, ${GOLD}, ${INDIGO})`, backgroundClip: 'padding-box, border-box', backgroundSize: 'auto, auto', backgroundPosition: '0% 0%, 0% 0%', backgroundRepeat: 'repeat, repeat', ...border('rgba(0, 0, 0, 0)'), ...radius('16px') }, rect: { x: 0, y: 0, w: 400, h: 100 }, children: [el('p', { children: [{ text: 'Ask anything' }] })] })
  const { root, stats } = convertTree(composer, TABLE)
  assert.equal(root.style['background-image'], 'linear-gradient(115deg, #C49544, #536A99)', 'the frame keeps only the border-box layer: Paper paints it under the transparent border')
  const [fill, text] = root.children
  assert.equal(fill.name, 'edge fill')
  assert.deepEqual([fill.style.position, fill.style.left, fill.style.top, fill.style.width, fill.style.height, fill.style['border-radius']], ['absolute', '0px', '0px', '100%', '100%', '15px'])
  assert.equal(fill.style['background-image'], 'linear-gradient(var(--color-background), var(--color-background))')
  // Paper paints a positioned layer above unpositioned siblings, so the content is positioned to stay on top
  assert.equal(text.style.position, 'relative')
  assert.equal(root.style.position, 'relative')
  assert.deepEqual(stats.lost, [])
  assert.match(stats.approximations.flatMap((entry) => entry.reasons).join('|'), /gradient edge/)
})

test('gradient text (background-clip: text) is one text layer carrying the gradient, not a gradient box', () => {
  const label = el('span', { classes: ['ai-shimmer'], used: { display: 'block', backgroundImage: `linear-gradient(90deg, rgb(103, 95, 88), ${GOLD}, rgb(103, 95, 88))`, backgroundClip: 'text', backgroundSize: '200% 100%', color: 'rgba(0, 0, 0, 0)', fontWeight: '600' }, rect: { x: 0, y: 0, w: 60, h: 19 }, children: [{ text: 'Thinking' }] })
  const { root } = convertTree(el('div', { used: { display: 'flex', flexDirection: 'column' }, children: [label] }), TABLE)
  const text = root.children[0]
  assert.equal(text.text, 'Thinking', 'a text layer, not a frame holding an invisible one')
  assert.equal(text.style['background-clip'], 'text')
  assert.equal(text.style.color, 'transparent')
  // Paper drops background-size: the 200% gradient is cut to the half the browser shows (0 → 50 % of it)
  assert.equal(text.style['background-image'], 'linear-gradient(90deg, var(--color-muted-foreground) 0%, #C49544 100%)')
})

test('a repeating gradient sized wider than its box is cut to the part the box shows', () => {
  // `ai-line` with motion off: a 300% sweep at position 0 shows its first third
  const line = el('div', { used: { display: 'block', backgroundImage: `linear-gradient(90deg, ${GOLD}, ${INDIGO}, ${GOLD}, ${INDIGO})`, backgroundSize: '300% 100%', backgroundRepeat: 'repeat', backgroundPosition: '0% 0%' }, spec: { height: '2px' }, rect: { x: 0, y: 0, w: 300, h: 2 } })
  const { root } = convertTree(el('div', { used: { display: 'flex', flexDirection: 'column' }, children: [line] }), TABLE)
  assert.equal(root.children[0].style['background-image'], 'linear-gradient(90deg, #C49544 0%, #536A99 100%)')
  assert.match(convertTree(el('div', { used: { display: 'flex', flexDirection: 'column' }, children: [line] }), TABLE).stats.approximations.flatMap((entry) => entry.reasons).join('|'), /cut to the part its box shows/)
})

test('a turned icon keeps its turn (an open disclosure chevron, a ring started at 12 o\'clock)', () => {
  const svg = (used) => ({ ...el('svg', { used: { display: 'inline-block', ...used }, spec: { width: '18px', height: '18px' }, rect: { x: 0, y: 0, w: 18, h: 18 } }), svg: '<svg viewBox="0 0 18 18" width="18" height="18"><circle cx="9" cy="9" r="7"></circle></svg>' })
  const { root } = convertTree(el('div', { used: { display: 'flex' }, children: [svg({ rotate: '-90deg' }), svg({ transform: 'matrix(0, 1, -1, 0, 0, 0)' })] }), TABLE)
  assert.match(root.children[0].raw, /style="[^"]*rotate:-90deg/)
  assert.match(root.children[1].raw, /style="[^"]*rotate:90deg/)
})

test('overlapping children keep the browser\'s stacking: a raised (z-10) row of tabs sits over the box it overlaps', () => {
  const tabs = el('div', { slot: 'tablist', used: { display: 'flex', position: 'relative', zIndex: '10' }, spec: { marginBottom: '-1.5px' }, rect: { x: 0, y: 0, w: 400, h: 36 }, children: [el('p', { children: [{ text: 'Ask' }] })] })
  const box = el('div', { slot: 'prompt-composer', used: { display: 'flex' }, rect: { x: 0, y: 34.5, w: 400, h: 100 }, children: [el('p', { children: [{ text: 'Ask anything' }] })] })
  const { root } = convertTree(el('div', { used: { display: 'flex', flexDirection: 'column' }, rect: { x: 0, y: 0, w: 400, h: 134.5 }, children: [tabs, box] }), TABLE)
  assert.deepEqual(root.children.map((node) => node.name), ['prompt-composer', 'tablist'], 'later is on top in Paper')
  assert.deepEqual(visibleTexts(el('div', { used: { display: 'flex', flexDirection: 'column' }, children: [tabs, box] })), ['Ask anything', 'Ask'], 'the text check reads the layers in the order Paper holds them')
})

test('a focus ring drawn in the browser\'s own style (outline-style: auto) is a plain line in Paper', () => {
  const tab = el('button', { used: { display: 'flex', outlineStyle: 'auto', outlineWidth: '1px', outlineColor: 'rgb(42, 38, 34)' }, children: [el('p', { children: [{ text: 'Agent' }] })] })
  assert.equal(convertTree(tab, TABLE).root.style.outline, '1px solid var(--color-foreground)')
})

test('a round mask that cuts a curve out of a layered fill is folded into one radial fill (a tab\'s curved foot)', () => {
  const foot = el('span', { slot: 'tab-fillet', used: { display: 'block', position: 'absolute', backgroundImage: `radial-gradient(circle at 0px 0px, rgba(0, 0, 0, 0) 9px, ${PAPER} 9.5px), conic-gradient(from 90deg at 0px 0px, ${GOLD}, ${GOLD} 90deg)`, backgroundClip: 'border-box, border-box', maskImage: 'radial-gradient(circle at 0px 0px, rgba(0, 0, 0, 0) 7.5px, rgb(42, 38, 34) 8px)' }, spec: { width: '9.5px', height: '9.5px' }, rect: { x: 0, y: 26, w: 9.5, h: 9.5 } })
  const { root, stats } = convertTree(el('div', { used: { display: 'flex', position: 'relative' }, rect: { x: 0, y: 0, w: 100, h: 36 }, children: [foot] }), TABLE)
  // see-through inside the curve, the ring's colour along it, the page colour beyond it: what the mask left visible.
  // Spelled the way Paper draws a radial gradient (read back from Paper): a circle to the farthest corner, its centre
  // and stops in %. The corner of a 9.5px square is 13.44px away, so the curve at 7.5px is 55.82% of the way.
  assert.equal(root.children[0].style['background-image'], 'radial-gradient(circle at 0% 0%, rgba(196, 149, 68, 0) 55.82%, #C49544 59.55%, #C49544 66.99%, var(--color-background) 70.71%)')
  assert.ok(!stats.lost.some((line) => /mask/.test(line)), stats.lost.join('|'))
  assert.match(stats.approximations.flatMap((entry) => entry.reasons).join('|'), /mask folded into the fill/)
})

test('a sentence that wraps before an inline chip is drawn line by line, as the browser broke it', () => {
  // "The September dip. It started the day the new / pricing page shipped [changelog]."  (two lines, 22px each)
  const chip = el('button', { slot: 'citation', used: { display: 'inline-block', backgroundColor: 'rgb(239, 228, 206)', paddingLeft: '8px', paddingRight: '8px' }, spec: { height: '20px', marginLeft: '2px' }, rect: { x: 135, y: 23, w: 72, h: 20 }, children: [{ text: 'changelog', frags: [{ text: 'changelog', x: 143, y: 23, w: 56, h: 20 }] }] })
  const paragraph = el('p', { used: { lineHeight: '22px' }, rect: { x: 0, y: 0, w: 316, h: 44 }, children: [
    { text: 'The September dip. It started the day the new pricing page shipped', frags: [{ text: 'The September dip. It started the day the new ', x: 0, y: 0, w: 300, h: 22 }, { text: 'pricing page shipped', x: 0, y: 22, w: 133, h: 22 }] },
    chip,
    { text: '.', frags: [{ text: '.', x: 207, y: 22, w: 3, h: 22 }] },
  ] })
  const { root, stats } = convertTree(paragraph, TABLE)
  assert.deepEqual(root.children.map((line) => line.name), ['line', 'line'])
  assert.deepEqual(root.children[0].children.map((node) => node.text), ['The September dip. It started the day the new'])
  assert.deepEqual(root.children[1].children.map((node) => node.name ?? node.text), ['pricing page shipped', 'spacer', 'citation', '.'], 'the chip stays on the line it shares with the end of the sentence, after its 2px margin')
  assert.equal(root.children[1].style['flex-wrap'], undefined, 'a line does not wrap')
  assert.equal(root.children[1].style['min-height'], '22px')
  assert.match(stats.approximations.flatMap((entry) => entry.reasons).join('|'), /line by line/)
  // the text check reads the same pieces Paper holds
  assert.deepEqual(visibleTexts(paragraph), ['The September dip. It started the day the new', 'pricing page shipped', 'changelog', '.'])
})

test('a highlight that starts mid-line and wraps keeps its fill on each of its lines', () => {
  const mark = el('mark', { used: { display: 'inline', backgroundColor: 'rgb(239, 228, 206)', paddingLeft: '2px', paddingRight: '2px' }, rect: { x: 0, y: 0, w: 300, h: 44 }, children: [{ text: 'Signups beat target in July but missed it in September.', frags: [{ text: 'Signups beat target in July ', x: 150, y: 0, w: 150, h: 22 }, { text: 'but missed it in September.', x: 0, y: 22, w: 160, h: 22 }] }] })
  const paragraph = el('div', { used: { lineHeight: '22px' }, rect: { x: 0, y: 0, w: 316, h: 44 }, children: [{ text: 'Q3 closed ahead of plan. ', frags: [{ text: 'Q3 closed ahead of plan. ', x: 0, y: 0, w: 150, h: 22 }] }, mark] })
  const { root } = convertTree(paragraph, TABLE)
  const [first, second] = root.children
  assert.deepEqual(first.children.map((node) => node.text ?? node.children[0].text), ['Q3 closed ahead of plan. ', 'Signups beat target in July'])
  assert.deepEqual([first.children[1].style['background-color'], first.children[1].style.padding], ['var(--color-card)', '0px 0px 0px 2px'], 'the left padding only where the highlight starts')
  assert.deepEqual([second.children[0].style['background-color'], second.children[0].style.padding, second.children[0].children[0].text], ['var(--color-card)', '0px 2px 0px 0px', 'but missed it in September.'])
})

test('a one-column grid with a 1fr row lets that row take the free height (a panel\'s thread between header and composer)', () => {
  const part = (slot, y, h) => el('div', { slot, used: { display: 'flex', flexDirection: 'column' }, rect: { x: 0, y, w: 384, h }, children: [el('p', { children: [{ text: slot }] })] })
  const panel = el('section', { used: { display: 'grid', gridTemplateColumns: '384px' }, spec: { height: '560px', gridTemplateRows: 'auto minmax(0px, 1fr) auto' }, rect: { x: 0, y: 0, w: 384, h: 560 }, children: [part('header', 0, 48), part('thread', 48, 406), part('composer', 454, 106)] })
  const { root } = convertTree(panel, TABLE)
  assert.deepEqual(root.children.map((node) => [node.name, node.style['flex-grow'], node.style['flex-basis']]), [['header', undefined, undefined], ['thread', '1', '0px'], ['composer', undefined, undefined]])

  // without a height of its own the grid grows with its content: the 1fr row keeps its content's height and grows from there
  const open = el('section', { used: { display: 'grid', gridTemplateColumns: '1232px' }, spec: { gridTemplateRows: 'minmax(0px, 1fr) auto' }, rect: { x: 0, y: 0, w: 1232, h: 1371 }, children: [part('thread', 0, 1245), part('composer', 1245, 126)] })
  assert.deepEqual(convertTree(open, TABLE).root.children.map((node) => [node.style['flex-grow'], node.style['flex-basis']]), [['1', undefined], [undefined, undefined]])

  // a page with a minimum height and one implicit row: the row stretches, and the page inside it with it
  const page = el('div', { used: { display: 'grid', gridTemplateColumns: '1232px' }, spec: { minHeight: '640px' }, rect: { x: 0, y: 0, w: 1232, h: 640 }, children: [part('section', 0, 640)] })
  assert.equal(convertTree(page, TABLE).root.children[0].style['flex-grow'], '1')
  // …but not when the grid packs its rows at the top, or the child has a height of its own
  const packed = el('div', { used: { display: 'grid', gridTemplateColumns: '384px', alignContent: 'start' }, spec: { height: '300px' }, rect: { x: 0, y: 0, w: 384, h: 300 }, children: [part('a', 0, 20)] })
  assert.equal(convertTree(packed, TABLE).root.children[0].style['flex-grow'], undefined)
})

test('a label the browser cut short with "…" is drawn in a box of its measured width, not centred (Paper would wrap it)', () => {
  const chip = { ...el('button', { slot: 'citation', used: { display: 'inline-block', textAlign: 'center', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflowX: 'hidden', overflowY: 'hidden', backgroundColor: 'rgb(239, 228, 206)', paddingLeft: '8px', paddingRight: '8px' }, spec: { height: '20px', maxWidth: '160px' }, rect: { x: 0, y: 0, w: 160, h: 20 }, children: [{ text: 'Quarterly revenue reconciliation workbook' }] }), truncated: true }
  const { root, stats } = convertTree(el('div', { used: { display: 'flex' }, children: [chip] }), TABLE)
  assert.match(stats.approximations.flatMap((entry) => entry.reasons).join('|'), /cut short/)
  const [frame] = root.children
  assert.equal(frame.style.width, '160px')
  assert.deepEqual([frame.children[0].style['text-align'], frame.children[0].style['text-overflow'], frame.children[0].style['white-space']], [undefined, 'ellipsis', 'nowrap'])
  // the same chip with a title that fits stays centred
  const fits = convertTree(el('div', { used: { display: 'flex' }, children: [{ ...chip, truncated: false }] }), TABLE).root.children[0]
  assert.equal(fits.children[0].style['text-align'], 'center')
})

test('an icon in a line of text nudged by vertical-align keeps its nudge (the "›" after a step that opens)', () => {
  const chevron = { ...el('svg', { used: { display: 'inline-block', verticalAlign: '-2.04px' }, spec: { width: '14px', height: '14px' }, rect: { x: 200, y: 3, w: 14, h: 14 } }), svg: '<svg viewBox="0 0 24 24" width="14" height="14"></svg>' }
  const line = el('span', { children: [{ text: 'Compared each month with targets' }, chevron] })
  assert.match(convertTree(line, TABLE).root.children[1].raw, /style="[^"]*position:relative;top:2\.04px/)
  // in a flex row vertical-align does nothing, in the browser and here
  const row = el('div', { used: { display: 'flex' }, children: [chevron] })
  assert.doesNotMatch(convertTree(row, TABLE).root.children[0].raw, /top:/)
})

test('a one-cell grid that centres its only child (an avatar) centres it both ways', () => {
  const mark = { ...el('svg', { used: { display: 'inline-block' }, spec: { width: '15px', height: '15px' }, rect: { x: 6.5, y: 6.5, w: 15, h: 15 } }), svg: '<svg viewBox="0 0 24 24" width="15" height="15"></svg>' }
  const avatar = el('span', { slot: 'reply-avatar', used: { display: 'grid', gridTemplateColumns: '26px', alignItems: 'center', justifyItems: 'center', ...border('rgb(0, 0, 0)'), ...radius('3.35544e+07px') }, spec: { width: '28px', height: '28px' }, rect: { x: 0, y: 0, w: 28, h: 28 }, children: [mark] })
  const { root } = convertTree(el('div', { used: { display: 'flex' }, children: [avatar] }), TABLE)
  assert.deepEqual([root.children[0].style['align-items'], root.children[0].style['justify-content']], ['center', 'center'])
})
