/**
 * What every colour role is for — written once, rendered into DESIGN.md, llms.txt,
 * the agent-rules file apps install, and Storybook's Colors page.
 *
 * An agent choosing a colour reads names, and the names do not explain themselves:
 * seven surface roles are three colours (`card` = `popover` = `sidebar`; `secondary` =
 * `muted` = `accent`), `primary` is ink rather than a brand colour, and `accent` is the
 * pale highlight rather than the accent. Before this module the agent docs named 3 to
 * 12 of the 31 roles and said when to use none of them.
 *
 * Every line is grounded in how shipped code uses the role (842 class uses, measured
 * 2026-09-21; docs/drafts/2026-09-21-role-intents-draft.md holds the counts and
 * examples). `use` and `never` stay under 170 characters each: this text is installed
 * into apps and read by agents on every task.
 *
 * roles.test.mjs fails when a role ships without a line here, or a line names a role
 * that does not ship.
 */
import { tokens } from '../tokens/quill.tokens.mjs'

/** The 31 contract roles, in the token source's order. */
export const ROLE_INTENTS = {
  'background': { use: 'The page ground and full-width sections; the cut-out fill of a control sitting on another surface (outline button, switch thumb, active tab).', never: 'Cards, menus or dialogs. Those sit one step warmer, on `card` or `popover`.', pairs: 'foreground' },
  'foreground': { use: 'Strong text: headings, names, values, totals. At 10% it is the hairline ring around cards and floating panels.', never: 'Captions, meta or placeholder text. That is `muted-foreground`.', pairs: 'background' },
  'card': { use: 'Raised surfaces in the page: cards, inline banners, a chat window, kanban tasks, an empty-state panel. Its edge is the ring, `ring-1 ring-foreground/10`, as on Card.', never: 'Floating layers such as menus and dialogs (those are `popover`), and never the page ground. Never `border` as its edge.', pairs: 'card-foreground' },
  'card-foreground': { use: 'The default text colour inside a card, set once on its root.', never: 'Text outside a `card` surface.', pairs: 'card' },
  'popover': { use: 'Anything that floats above the page: menus, selects, popovers, hover cards, dialogs, sheets, the command palette.', never: 'In-page cards or sections. Those are `card`.', pairs: 'popover-foreground' },
  'popover-foreground': { use: 'The default text colour inside a floating layer, set once on its root.', never: 'Text outside a `popover` surface.', pairs: 'popover' },
  'primary': { use: 'The main action and "on / done" states: default button, checked checkbox, radio and switch, progress fill, selected date, finished step.', never: 'Brand colour or "make it pop" emphasis. `primary` is ink; the brand accent is the accent pigment.', pairs: 'primary-foreground' },
  'primary-foreground': { use: 'Text and icons on an ink (`primary`) fill.', never: 'Text on a paper surface. It is paper-coloured, so it disappears.', pairs: 'primary' },
  'secondary': { use: 'The fill of the secondary button and the neutral badge. Reach it with `variant="secondary"`, not with a class.', never: 'A second brand colour, or general wells and panels. Those are `muted`.', pairs: 'secondary-foreground' },
  'secondary-foreground': { use: 'The label on a secondary button or badge. It arrives with the variant.', never: '"Secondary" meaning quieter text. Quiet text is `muted-foreground`.', pairs: 'secondary' },
  'muted': { use: 'Quiet fills: icon wells, avatar fallbacks, skeletons, tab tracks, hover washes on controls and rows. A slider or progress track is `muted` with 10% `input` mixed in.', never: 'Text: `text-muted` is a paper tone and vanishes. Nor the highlight of a list or menu item; that is `accent`.', pairs: 'muted-foreground' },
  'muted-foreground': { use: 'Supporting text: descriptions, captions, timestamps, helper text, placeholders, table meta. Icons at rest.', never: 'Headings, values or the main label of a control; and never on an ink fill.', pairs: 'muted' },
  'accent': { use: 'The highlighted item in a list or menu: the row under the pointer or keyboard focus, and the current item in a nav.', never: 'Brand emphasis, CTAs or accent text. It is a pale paper tone, not the accent pigment. Buttons and table rows hover with `muted`.', pairs: 'accent-foreground' },
  'accent-foreground': { use: 'Text and icons on a highlighted (`accent`) row.', never: 'Accent-coloured text. It is ink; coloured accent text comes from `--accent-pigment-text`.', pairs: 'accent' },
  'destructive': { use: 'Errors and destructive actions: the invalid-field border and ring, error text, the destructive button, badge, alert and menu item.', never: 'A solid fill with light text: the contract has no foreground partner for it, and the shipped button is a 10% tint with destructive text. Never a hover colour.' },
  'border': { use: 'Hairlines: the outline of a list, table or Calendar wrapper, a dashed dropzone, row rules, separators, step connectors (`bg-border` draws a 1px line), chart grid lines.', never: 'The edge of a form control (12% fails the 3:1 non-text rule; controls use `input`), or of a card or floating panel: those take `ring-1 ring-foreground/10`.' },
  'input': { use: 'The boundary of anything you type into or toggle (input, select, checkbox, radio, dropzone) and the empty track of a switch.', never: 'Decorative dividers (too heavy; use `border`) or card outlines (the ring), and never text.' },
  'ring': { use: 'Keyboard focus, built into every primitive (3px at 50%). Also the outline of the one selected or featured item in a set: the chosen plan, the picked option.', never: 'A hand-picked focus colour, or decoration with no state behind it. It follows `data-accent`.' },
  'chart-1': { use: 'The first data series in a chart, passed as `var(--chart-1)` in the chart config.', never: 'UI colour (badges, status, text, fills), and never swapped with another series.' },
  'chart-2': { use: 'The second data series.', never: 'Links, info states or any UI; never the first series.' },
  'chart-3': { use: 'The third data series.', never: 'Warnings, highlights or any UI.' },
  'chart-4': { use: 'The fourth data series.', never: 'Any UI. Never skip to it to get its hue.' },
  'chart-5': { use: 'The fifth data series. Past five, group the rest as "Other".', never: 'Success states or any UI; never a sixth invented colour.' },
  'sidebar': { use: 'The ground of the app\'s side navigation rail.', never: 'Any surface that is not the side navigation. Cards use `card`.', pairs: 'sidebar-foreground' },
  'sidebar-foreground': { use: 'Default text and icons inside the sidebar; at 70% for group labels.', never: 'Text outside the sidebar.', pairs: 'sidebar' },
  'sidebar-primary': { use: 'A solid ink element inside the sidebar, such as the workspace logo tile.', never: 'The current nav item. That is `sidebar-accent`.', pairs: 'sidebar-primary-foreground' },
  'sidebar-primary-foreground': { use: 'Text or an icon on a `sidebar-primary` fill.', never: 'Text on the sidebar\'s own ground; it disappears.', pairs: 'sidebar-primary' },
  'sidebar-accent': { use: 'The hovered, pressed and current item in the sidebar. It arrives with `SidebarMenuButton` and its `isActive` prop.', never: 'Brand emphasis. It is the pale highlight, as `accent` is.', pairs: 'sidebar-accent-foreground' },
  'sidebar-accent-foreground': { use: 'Text and icons on a highlighted sidebar item.', never: 'Accent-coloured text.', pairs: 'sidebar-accent' },
  'sidebar-border': { use: 'Dividers and sub-menu guide lines inside the sidebar, and the outline of a floating sidebar.', never: 'Lines outside the sidebar. Those are `border`.' },
  'sidebar-ring': { use: 'The keyboard focus ring on sidebar items. Built into the Sidebar parts.', never: 'A hand-picked focus colour or a decorative outline.' },
}

/** Roles the contract has no word for. `form` says how to reach each one. */
export const STATUS_INTENTS = {
  'text-accent-color': { form: 'variable', use: 'The one italic accent word in a headline, and the colour of a bare `<a>`. Both come free from the theme (`.fraunces-accent`, `a`).', never: 'Buttons, fills or body text. One accent word per headline, never two.' },
  'link': { form: 'class', use: 'A text link inside prose, when you set its colour by hand (`text-link`). It follows the chosen accent.', never: 'Buttons or navigation. A link-styled Button (`variant="link"`) is ink; nav links are `muted-foreground` with an `accent` highlight.' },
  'success': { form: 'class', use: 'Text or an icon confirming that something worked (`text-success`).', never: 'A fill behind text, or decoration. It is moss, also the default accent, so use it only when the meaning is "succeeded".' },
  'warning': { form: 'class', use: 'Cautionary text or an icon (`text-warning`).', never: 'Errors (that is `destructive`). Never swap in `--gold` or `--gold-deep` for text: both fail AA on light grounds.' },
  'info': { form: 'class', use: 'Neutral, informational text or an icon (`text-info`).', never: 'Links. Links follow the accent, not indigo.' },
  'working': { form: 'class', use: 'Live activity: an agent or job running right now (`text-working`).', never: 'Success or info. Teal sits between moss and indigo so that live work reads as its own signal.' },
  'queued': { form: 'class', use: 'Waiting its turn in a run list (`text-queued`). It should recede.', never: 'Anything that needs attention.' },
}

/**
 * Sanctioned opacity forms: a role or pigment at a fixed alpha, written as the Tailwind
 * opacity modifier. Keyed by the tint's name (`tint/<of>/<pct>`); `code` is what an agent types.
 */
export const TINT_INTENTS = {
  'tint/destructive/10': { code: '`bg-destructive/10`', use: 'The fill of the destructive button and badge, and the focused destructive menu item.', never: 'A whole alert or panel. The destructive Alert stays on `card`; only its text turns.' },
  'tint/moss/20': { code: '`<ToneBadge tone="moss">`', use: 'The wash behind a moss ToneBadge: positive, current.', never: 'A hand-built pill or panel. Every tag renders through ToneBadge.' },
  'tint/gold/25': { code: '`<ToneBadge tone="gold">`', use: 'The wash behind a gold ToneBadge: caution.', never: 'A hand-built pill or panel.' },
  'tint/terracotta/16': { code: '`<ToneBadge tone="terracotta">`', use: 'The wash behind a terracotta ToneBadge: needs attention.', never: 'A hand-built pill or panel.' },
  'tint/indigo/30': { code: '`<ToneBadge tone="indigo">`', use: 'The wash behind an indigo ToneBadge: informational.', never: 'A hand-built pill or panel.' },
  'tint/foreground/10': { code: '`ring-1 ring-foreground/10`', use: 'The hairline ring around a Card and every floating panel, hand-built ones included.', never: 'A fill or text; nor dividers, list and table wrappers or field edges. Those are `border`.' },
  'tint/input/30': { code: '`bg-input/30`', use: 'The faint fill inside form controls on dark themes, and the search field inside the command palette and combobox.', never: 'The control\'s edge on the page. That stays solid `input` to keep 3:1.' },
  'tint/chart-1/20': { code: '`fill="var(--chart-1)" fillOpacity={0.2}`', use: 'The soft area under the first series\' line, below a full-strength stroke of the same series.', never: 'UI tints, or a series other than the stroke\'s own.' },
  'tint/chart-2/20': { code: '`fill="var(--chart-2)" fillOpacity={0.2}`', use: 'The soft area under the second series\' line.', never: 'UI tints, or a series other than the stroke\'s own.' },
  'tint/muted/50': { code: '`bg-muted/50`', use: 'A half-strength well: card, dialog and table footers, table-row hover, kanban columns.', never: 'Text, or where the full `muted` fill is already the quiet option (icon wells, skeletons).' },
  'tint/primary/10': { code: '`bg-primary/10`', use: 'The "current, not yet done" state beside a solid-ink "done": the current wizard step.', never: 'Hover. Hover is `muted` or `accent`.' },
  'tint/sidebar-border/8': { code: '`border-sidebar-border`', use: 'The sidebar\'s faint dividers. The role is already ink at about 8%, so code writes the plain role.', never: 'Lines outside the sidebar.' },
  'tint/sidebar-foreground/70': { code: '`text-sidebar-foreground/70`', use: 'The small group label above a set of sidebar links.', never: 'Sidebar link text itself. That is full-strength `sidebar-foreground`.' },
  'tint/ring/50': { code: '`ring-3 ring-ring/50`', use: 'The keyboard-focus ring on every control, with `border-ring`. Built into the primitives.', never: 'A hand-drawn focus treatment, or a decorative glow.' },
  'tint/destructive/20': { code: '`ring-3 ring-destructive/20`', use: 'The ring around an invalid field, with `border-destructive`, when `aria-invalid` is set.', never: 'Emphasis or a warning wash. It follows the invalid state only.' },
  'tint/input/50': { code: '`bg-input/50`', use: 'The wash inside a disabled field, with 50% opacity on the control.', never: 'A resting field. At rest a field is transparent on light themes.' },
  'tint/primary/80': { code: '`hover:bg-primary/80`', use: 'The default button under the pointer. Built into the primitive.', never: 'A resting fill, or a "lighter primary" for emphasis.' },
  'tint/foreground/5': { code: '`hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]`', use: 'The secondary button under the pointer: 5% ink over its fill. Built into the primitive.', never: 'A wash on anything else; the general hover wash is `muted` or `accent`.' },
  'tint/destructive/40': { code: '`focus-visible:border-destructive/40`', use: 'The border of a focused destructive button, with its `ring-destructive/20` ring.', never: 'A fill or text; the invalid-field border is full `destructive`.' },
  'tint/secondary/80': { code: '`[a]:hover:bg-secondary/80`', use: 'A secondary badge, rendered as a link, under the pointer. Built into the primitive.', never: 'A resting fill.' },
}

const primitive = (ref) => ref.replace(/^var\(--|\)$/g, '')

/** One line per role. `heading` lets each document choose its own level. */
export function renderRolesSection(t = tokens, { heading = '###' } = {}) {
  const L = []
  L.push('Components speak 31 colour roles as classes: `bg-background`, `text-muted-foreground`, `border-border`. The names are shadcn-compatible, so stock primitives and third-party blocks land on Quill\'s palette with no edits. Seven surface roles are only three colours (`card` = `popover` = `sidebar`; `secondary` = `muted` = `accent`), so pick by the job below, never by the look.')
  L.push('')
  L.push(`${heading} The contract`)
  for (const [k, v] of Object.entries(t.semantic)) {
    const r = ROLE_INTENTS[k]
    L.push(`- \`${k}\` (${primitive(v)}) — ${r.use} **Never:** ${r.never}${r.pairs ? ` Pairs with \`${r.pairs}\`.` : ''}`)
  }
  L.push('')
  L.push(`${heading} Accent and status`)
  L.push('The contract has no word for these. Each is a variable (`--success`); the ones marked class also have a text class (`text-success`). Every one clears 4.5:1 as text on page, card and well in all five themes; none is checked as a fill behind text.')
  for (const [k, v] of Object.entries(t.status)) {
    const r = STATUS_INTENTS[k]
    L.push(`- \`--${k}\` (${primitive(v)}, ${r.form}) — ${r.use} **Never:** ${r.never}`)
  }
  L.push('')
  L.push(`${heading} Sanctioned tints`)
  L.push('A role at a fixed opacity. These are the only opacity forms the system uses on purpose; reach for one before inventing another.')
  for (const r of Object.values(TINT_INTENTS)) L.push(`- ${r.code} — ${r.use} **Never:** ${r.never}`)
  L.push('')
  L.push(`${heading} Two rules the names hide`)
  L.push('- **Hover has two names and one colour.** Items in a list or menu highlight with `accent`; standalone controls (buttons, toggles) and table rows wash with `muted`.')
  L.push('- **Links.** A link in prose follows the accent (a bare `<a>` gets it from the theme; `text-link` sets it by hand). A link-styled Button is ink.')
  return L.join('\n')
}

/**
 * The same guidance in about 2 KB, for the rules file an app loads into every
 * session (it has an 18 KB budget, and the full table is 12). Grouped by the job an
 * agent is doing; the full per-role table is in llms.txt and DESIGN.md.
 */
export function renderRolesCompact(t = tokens) {
  const status = Object.keys(t.status).filter((k) => STATUS_INTENTS[k].form === 'class').map((k) => `\`text-${k}\``)
  const tints = Object.values(TINT_INTENTS).map((r) => r.code).filter((c) => /^`(bg|ring|text)-/.test(c))
  return [
    `Components speak ${Object.keys(t.semantic).length} colour roles as classes. Several share a colour (\`card\` = \`popover\` = \`sidebar\`; \`secondary\` = \`muted\` = \`accent\`), so pick by the job, never by the look.`,
    '- **Surfaces** — `background` page · `card` raised, in the page · `popover` anything floating · `sidebar` the nav rail · `muted` quiet wells · `secondary` only through `variant="secondary"`.',
    '- **Text** — `foreground` strong · `muted-foreground` supporting · a `-foreground` role is text ON that surface. Never `text-muted`: it is a paper tone and vanishes.',
    '- **Actions** — `primary` is INK: the main action and on / done states, never a brand colour. `destructive` is errors, as a 10% tint with destructive text, never a solid fill.',
    '- **`accent` is the pale highlight, not the brand accent.** The brand accent is the accent pigment; it arrives through `ring`, links and the one italic accent word.',
    '- **Hover** — list and menu items highlight with `accent`; buttons, toggles and table rows wash with `muted`. Same colour, two jobs.',
    '- **Lines** — `border` hairlines and dividers · `input` the edge of anything typed into or toggled (it holds 3:1; `border` does not) · `ring` keyboard focus, and the one selected item in a set.',
    `- **Charts** — \`--chart-1\`…\`--chart-5\` in fixed order, never as UI colour.`,
    `- **Status, as text only** — ${status.join(' · ')}. Never a fill behind text. \`text-link\` is a prose link; a link-styled Button is ink.`,
    `- **Sanctioned tints** — ${tints.join(' · ')}. Reach for one before inventing another opacity.`,
    `- Every role with its use-for / never-for line: the Colour roles table in llms.txt.`,
  ].join('\n')
}
