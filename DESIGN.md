# Quill — Design System Spec

A single-file reference for the **Quill** design system.
Everything an agent or developer needs to design on-brand: voice, color, type,
spacing, effects, components, iconography, and assets. Distilled from the live
token source and component files in this repo; every path named here exists,
and `scripts/repo-invariants.test.mjs` fails CI when one stops existing. The
spans between `<!-- generated:… -->` markers (§4, §5, §6, §11) are rendered from
the token source by `npm run build:llms` — edit `src/usage/foundations.mjs`, not
the text between the markers; the same renderer feeds llms.txt.

> **Brand in one line:** A low-contrast, editorial-derived visual language. Warm neutral grounds, ink-toned type, and a narrow accent palette reserved for meaning. No
> emoji, no decorative gradients (the AI gradient, which marks AI and nothing else, is the one exception — see Do / Don't below).

**Related files**
- `src/tokens/quill.tokens.mjs` — the source of truth for every value below;
  `src/tokens/themes.mjs` names the themes and accents.
- `registry/themes/quill.css` — the shipped token layer an app installs (it lands
  as `app/quill-theme.css`); `src/app/globals.css` is the site's cut of the same
  source.
- `registry/blocks` and `registry/lib` — the 55 blocks and the eighteen shipped
  components (`agent-steps`, `ai-badge`, `ai-button`, `ai-feedback`, `ai-mark`, `ai-message`, `ai-notice`, `ai-popover`, `ai-thinking`, `approval-card`, `citations`, `icon`, `model-picker`, `prompt-composer`, `question-card`, `suggested-prompts`, `tone-badge`, `usage-meter`).
- `src/components/ui` — the stock shadcn primitives the token layer restyles
  (apps install these from shadcn, not from Quill).
- `public/usage` — one usage page per component and block, generated from
  `src/usage`; `public/llms.txt` is the agent index.
- `PRODUCT.md` — Quill's own product brief; `AGENTS.md` — how to work in this repo.

---

## 1. Brand & product context

**Quill** is the design system for digital products. The brand feels editorial, collected, and curated. The voice is
that of an exclusive, premium and trusted product agency that sells apps — warm, unhurried and quietly confident.

Source of truth for all token values: `src/tokens/quill.tokens.mjs` — edit
there, then `npm run build:tokens` regenerates the CSS token blocks and the
generated exports.

---

## 2. Color

Everything sits on digital paper.
The values below are **Dawn**, the default theme. Three **digital papers**
(grounds), three **inks** (text), four **pigments** (accents, carefully selected pigments that bring a creative warmth and feel to each page). The Classic themes (§3) deliberately swap
this palette for pure neutrals.

### Digital papers — surfaces / grounds
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F5EDDD` | base page — pressed cream |
| `--paper-warm` | `#EFE4CE` | cards, raised surfaces |
| `--paper-deep` | `#E8DCC0` | wells, insets, muted chips |

### Inks — text / strokes
| Token | Hex | Use |
|---|---|---|
| `--ink` | `#2A2622` | primary text, warm near-black |
| `--ink-soft` | `#5C524A` | secondary text, body at ease |
| `--ink-muted` | `#675F58` | captions, meta, disabled |

### Pigments — accents (each has a `-deep` press/hover shade)
| Token | Hex | Deep | Use |
|---|---|---|---|
| `--moss` | `#7A8C5C` | `#5E6E43` | **the signature** — the default accent: the one italic word, links, the focus ring; success. Never a CTA fill: actions are ink |
| `--terracotta` | `#C4684B` | `#944A33` | danger / destructive; the warm pole in diverging charts |
| `--indigo` | `#5B6B8A` | `#44516D` | info; an accent option; the cool pole in diverging charts |
| `--gold` | `#B89968` | `#9A7D4E` | highlight, warning |

### Hairlines — ink at low alpha over digital paper
`--line-faint` (ink 8%) · `--line-soft` (12%) · `--line` (15%) · `--line-strong` (20%).
Borders are always ink-at-alpha, never a solid grey.

### The semantic contract (reach for these in components)
<!-- generated:roles:start -->
Components speak 31 colour roles as classes: `bg-background`, `text-muted-foreground`, `border-border`. The names are shadcn-compatible, so stock primitives and third-party blocks land on Quill's palette with no edits. Seven surface roles are only three colours (`card` = `popover` = `sidebar`; `secondary` = `muted` = `accent`), so pick by the job below, never by the look.

#### The contract
- `background` (paper) — The page ground and full-width sections; the cut-out fill of a control sitting on another surface (outline button, switch thumb, active tab). **Never:** Cards, menus or dialogs. Those sit one step warmer, on `card` or `popover`. Pairs with `foreground`.
- `foreground` (ink) — Strong text: headings, names, values, totals. At 10% it is the hairline ring around cards and floating panels. **Never:** Captions, meta or placeholder text. That is `muted-foreground`. Pairs with `background`.
- `card` (paper-warm) — Raised surfaces in the page: cards, inline banners, a chat window, kanban tasks, an empty-state panel. Its edge is the ring, `ring-1 ring-foreground/10`, as on Card. **Never:** Floating layers such as menus and dialogs (those are `popover`), and never the page ground. Never `border` as its edge. Pairs with `card-foreground`.
- `card-foreground` (ink) — The default text colour inside a card, set once on its root. **Never:** Text outside a `card` surface. Pairs with `card`.
- `popover` (paper-warm) — Anything that floats above the page: menus, selects, popovers, hover cards, dialogs, sheets, the command palette. **Never:** In-page cards or sections. Those are `card`. Pairs with `popover-foreground`.
- `popover-foreground` (ink) — The default text colour inside a floating layer, set once on its root. **Never:** Text outside a `popover` surface. Pairs with `popover`.
- `primary` (ink) — The main action and "on / done" states: default button, checked checkbox, radio and switch, progress fill, selected date, finished step. **Never:** Brand colour or "make it pop" emphasis. `primary` is ink; the brand accent is the accent pigment. Pairs with `primary-foreground`.
- `primary-foreground` (paper) — Text and icons on an ink (`primary`) fill. **Never:** Text on a paper surface. It is paper-coloured, so it disappears. Pairs with `primary`.
- `secondary` (paper-deep) — The fill of the secondary button and the neutral badge. Reach it with `variant="secondary"`, not with a class. **Never:** A second brand colour, or general wells and panels. Those are `muted`. Pairs with `secondary-foreground`.
- `secondary-foreground` (ink) — The label on a secondary button or badge. It arrives with the variant. **Never:** "Secondary" meaning quieter text. Quiet text is `muted-foreground`. Pairs with `secondary`.
- `muted` (paper-deep) — Quiet fills: icon wells, avatar fallbacks, skeletons, tab tracks, hover washes on controls and rows. A slider or progress track is `muted` with 10% `input` mixed in. **Never:** Text: `text-muted` is a paper tone and vanishes. Nor the highlight of a list or menu item; that is `accent`. Pairs with `muted-foreground`.
- `muted-foreground` (ink-muted) — Supporting text: descriptions, captions, timestamps, helper text, placeholders, table meta. Icons at rest. **Never:** Headings, values or the main label of a control; and never on an ink fill. Pairs with `muted`.
- `accent` (paper-deep) — The highlighted item in a list or menu: the row under the pointer or keyboard focus, and the current item in a nav. **Never:** Brand emphasis, CTAs or accent text. It is a pale paper tone, not the accent pigment. Buttons and table rows hover with `muted`. Pairs with `accent-foreground`.
- `accent-foreground` (ink) — Text and icons on a highlighted (`accent`) row. **Never:** Accent-coloured text. It is ink; coloured accent text comes from `--accent-pigment-text`. Pairs with `accent`.
- `destructive` (terracotta-deep) — Errors and destructive actions: the invalid-field border and ring, error text, the destructive button, badge, alert and menu item. **Never:** A solid fill with light text: the contract has no foreground partner for it, and the shipped button is a 10% tint with destructive text. Never a hover colour.
- `border` (line-soft) — Hairlines: the outline of a list, table or Calendar wrapper, a dashed dropzone, row rules, separators, step connectors (`bg-border` draws a 1px line), chart grid lines. **Never:** The edge of a form control (12% fails the 3:1 non-text rule; controls use `input`), or of a card or floating panel: those take `ring-1 ring-foreground/10`.
- `input` (line-control) — The boundary of anything you type into or toggle (input, select, checkbox, radio, dropzone) and the empty track of a switch. **Never:** Decorative dividers (too heavy; use `border`) or card outlines (the ring), and never text.
- `ring` (accent-pigment-text) — Keyboard focus, built into every primitive (3px at 50%). Also the outline of the one selected or featured item in a set: the chosen plan, the picked option. **Never:** A hand-picked focus colour, or decoration with no state behind it. It follows `data-accent`.
- `chart-1` (chart-series-1) — The first data series in a chart, passed as `var(--chart-1)` in the chart config. **Never:** UI colour (badges, status, text, fills), and never swapped with another series.
- `chart-2` (chart-series-2) — The second data series. **Never:** Links, info states or any UI; never the first series.
- `chart-3` (chart-series-3) — The third data series. **Never:** Warnings, highlights or any UI.
- `chart-4` (chart-series-4) — The fourth data series. **Never:** Any UI. Never skip to it to get its hue.
- `chart-5` (chart-series-5) — The fifth data series. Past five, group the rest as "Other". **Never:** Success states or any UI; never a sixth invented colour.
- `sidebar` (paper-warm) — The ground of the app's side navigation rail. **Never:** Any surface that is not the side navigation. Cards use `card`. Pairs with `sidebar-foreground`.
- `sidebar-foreground` (ink) — Default text and icons inside the sidebar; at 70% for group labels. **Never:** Text outside the sidebar. Pairs with `sidebar`.
- `sidebar-primary` (ink) — A solid ink element inside the sidebar, such as the workspace logo tile. **Never:** The current nav item. That is `sidebar-accent`. Pairs with `sidebar-primary-foreground`.
- `sidebar-primary-foreground` (paper) — Text or an icon on a `sidebar-primary` fill. **Never:** Text on the sidebar's own ground; it disappears. Pairs with `sidebar-primary`.
- `sidebar-accent` (paper-deep) — The hovered, pressed and current item in the sidebar. It arrives with `SidebarMenuButton` and its `isActive` prop. **Never:** Brand emphasis. It is the pale highlight, as `accent` is. Pairs with `sidebar-accent-foreground`.
- `sidebar-accent-foreground` (ink) — Text and icons on a highlighted sidebar item. **Never:** Accent-coloured text. Pairs with `sidebar-accent`.
- `sidebar-border` (line-faint) — Dividers and sub-menu guide lines inside the sidebar, and the outline of a floating sidebar. **Never:** Lines outside the sidebar. Those are `border`.
- `sidebar-ring` (accent-pigment-text) — The keyboard focus ring on sidebar items. Built into the Sidebar parts. **Never:** A hand-picked focus colour or a decorative outline.

#### Accent and status
The contract has no word for these. Each is a variable (`--success`); the ones marked class also have a text class (`text-success`). Every one clears 4.5:1 as text on page, card and well in all five themes; none is checked as a fill behind text.
- `--text-accent-color` (accent-pigment-text, variable) — The one italic accent word in a headline, and the colour of a bare `<a>`. Both come free from the theme (`.fraunces-accent`, `a`). **Never:** Buttons, fills or body text. One accent word per headline, never two.
- `--link` (accent-pigment-text, class) — A text link inside prose, when you set its colour by hand (`text-link`). It follows the chosen accent. **Never:** Buttons or navigation. A link-styled Button (`variant="link"`) is ink; nav links are `muted-foreground` with an `accent` highlight.
- `--success` (moss-deep, class) — Text or an icon confirming that something worked (`text-success`). **Never:** A fill behind text, or decoration. It is moss, also the default accent, so use it only when the meaning is "succeeded".
- `--warning` (gold-text, class) — Cautionary text or an icon (`text-warning`). **Never:** Errors (that is `destructive`). Never swap in `--gold` or `--gold-deep` for text: both fail AA on light grounds.
- `--info` (indigo-deep, class) — Neutral, informational text or an icon (`text-info`). **Never:** Links. Links follow the accent, not indigo.
- `--working` (teal-deep, class) — Live activity: an agent or job running right now (`text-working`). **Never:** Success or info. Teal sits between moss and indigo so that live work reads as its own signal.
- `--queued` (ink-muted, class) — Waiting its turn in a run list (`text-queued`). It should recede. **Never:** Anything that needs attention.

#### Sanctioned tints
A role at a fixed opacity. These are the only opacity forms the system uses on purpose; reach for one before inventing another.
- `bg-destructive/10` — The fill of the destructive button and badge, and the focused destructive menu item. **Never:** A whole alert or panel. The destructive Alert stays on `card`; only its text turns.
- `<ToneBadge tone="moss">` — The wash behind a moss ToneBadge: positive, current. **Never:** A hand-built pill or panel. Every tag renders through ToneBadge.
- `<ToneBadge tone="gold">` — The wash behind a gold ToneBadge: caution. **Never:** A hand-built pill or panel.
- `<ToneBadge tone="terracotta">` — The wash behind a terracotta ToneBadge: needs attention. **Never:** A hand-built pill or panel.
- `<ToneBadge tone="indigo">` — The wash behind an indigo ToneBadge: informational. **Never:** A hand-built pill or panel.
- `ring-1 ring-foreground/10` — The hairline ring around a Card and every floating panel, hand-built ones included. **Never:** A fill or text; nor dividers, list and table wrappers or field edges. Those are `border`.
- `bg-input/30` — The faint fill inside form controls on dark themes, and the search field inside the command palette and combobox. **Never:** The control's edge on the page. That stays solid `input` to keep 3:1.
- `fill="var(--chart-1)" fillOpacity={0.2}` — The soft area under the first series' line, below a full-strength stroke of the same series. **Never:** UI tints, or a series other than the stroke's own.
- `fill="var(--chart-2)" fillOpacity={0.2}` — The soft area under the second series' line. **Never:** UI tints, or a series other than the stroke's own.
- `bg-muted/50` — A half-strength well: card, dialog and table footers, table-row hover, kanban columns. **Never:** Text, or where the full `muted` fill is already the quiet option (icon wells, skeletons).
- `bg-primary/10` — The "current, not yet done" state beside a solid-ink "done": the current wizard step. **Never:** Hover. Hover is `muted` or `accent`.
- `border-sidebar-border` — The sidebar's faint dividers. The role is already ink at about 8%, so code writes the plain role. **Never:** Lines outside the sidebar.
- `text-sidebar-foreground/70` — The small group label above a set of sidebar links. **Never:** Sidebar link text itself. That is full-strength `sidebar-foreground`.
- `ring-3 ring-ring/50` — The keyboard-focus ring on every control, with `border-ring`. Built into the primitives. **Never:** A hand-drawn focus treatment, or a decorative glow.
- `ring-3 ring-destructive/20` — The ring around an invalid field, with `border-destructive`, when `aria-invalid` is set. **Never:** Emphasis or a warning wash. It follows the invalid state only.
- `bg-input/50` — The wash inside a disabled field, with 50% opacity on the control. **Never:** A resting field. At rest a field is transparent on light themes.
- `hover:bg-primary/80` — The default button under the pointer. Built into the primitive. **Never:** A resting fill, or a "lighter primary" for emphasis.
- `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` — The secondary button under the pointer: 5% ink over its fill. Built into the primitive. **Never:** A wash on anything else; the general hover wash is `muted` or `accent`.
- `focus-visible:border-destructive/40` — The border of a focused destructive button, with its `ring-destructive/20` ring. **Never:** A fill or text; the invalid-field border is full `destructive`.
- `[a]:hover:bg-secondary/80` — A secondary badge, rendered as a link, under the pointer. Built into the primitive. **Never:** A resting fill.

#### Two rules the names hide
- **Hover has two names and one colour.** Items in a list or menu highlight with `accent`; standalone controls (buttons, toggles) and table rows wash with `muted`.
- **Links.** A link in prose follows the accent (a bare `<a>` gets it from the theme; `text-link` sets it by hand). A link-styled Button is ink.
<!-- generated:roles:end -->

A second vocabulary of surface, text and border aliases was retired in 0.10.0; the CHANGELOG maps each name to its contract role.

## 3. Dusk — the dark theme

The notebook, closed at dusk and opened again under a desk lamp — hence the
name. **Dusk** is an added theme, not the default (**Dawn**) — grounds become
**dark walnut** (deep, warm, low-chroma browns, like oiled wood and aged leather)
and the ink inverts to a warm **cream** that sits on the wood the way chalk
or gouache would. The warmth of Dawn is preserved, just turned down for the
evening. **Still no pure black, no pure white, no cold greys.** Source of truth:
`src/tokens/quill.tokens.mjs` (`npm run build:tokens` regenerates
`registry/themes/quill.css` and `src/app/globals.css`).

### Activation
Themes are **token remaps under `data-theme`** on a parent (usually `<html>`):
no attribute (or `light`) = **Dawn** (default), `data-theme="dark"` = **Dusk**,
`data-theme="classic-light"` / `data-theme="classic-dark"` = the Classic pair, and
`data-theme="intelligent"` = the cockpit theme (near-black grounds, teal working
status, instrument fonts). The canonical list is `ALL_MODES` in
`src/tokens/themes.mjs`; every hand-typed list is checked against it in CI. Set
the attribute and the whole token layer flips, **no JS required**. In apps, the `ThemeSelector`
block (`registry/blocks/theme-selector.tsx`) owns the attribute: after hydration
it reads the stored choice from `localStorage` (`quill-theme`, plus `quill-accent`
for the accent pigment) and stamps `<html>` — prerendered markup is always
Dawn/moss.

> **Implementation contract.** Values live once in a `--dk-*` set on `:root`
> (inert in Dawn — nothing reads them). A single `[data-theme="dark"]`
> selector remaps the real semantic tokens to them, so there is **one source of
> truth** per dark color and every component inherits Dusk for free — author
> against the semantic tokens (`--paper`, `--ink`, `--terracotta`…), never the
> `--dk-*` values directly. The Classic themes follow the same pattern with
> `--cl-*` / `--cd-*` sets, and Intelligent with `--int-*`.

### Walnut grounds — surfaces
| Token | Dawn | Dusk | Use |
|---|---|---|---|
| `--paper` | `#F5EDDD` | `#20180E` | base page — deep oiled walnut |
| `--paper-warm` | `#EFE4CE` | `#2A2014` | cards, raised surfaces |
| `--paper-deep` | `#E8DCC0` | `#352A1A` | wells, muted chips, image backdrops |

### Cream ink — text / strokes
| Token | Dawn | Dusk | Use |
|---|---|---|---|
| `--ink` | `#2A2622` | `#F1E7D3` | primary text — warm chalk cream |
| `--ink-soft` | `#5C524A` | `#C8B9A0` | secondary text, body at ease |
| `--ink-muted` | `#675F58` | `#AFA08A` | captions, meta, disabled, placeholders |

### Lifted pigments
Brightened and slightly desaturated so they read like colored pencil on a dark
page instead of disappearing into it. **In Dusk, the `-deep` variant is the
*brighter* one** — it does the work of legible accent text on tinted fills,
feedback colors, and hover-lighten states, where a darker pressed tone would
vanish on walnut.

| Token | Dawn | Dusk | `-deep` (Dawn → Dusk) |
|---|---|---|---|
| `--terracotta` | `#C4684B` | `#DB8568` | `#944A33` → `#E89A80` |
| `--moss` | `#7A8C5C` | `#A2B57E` | `#5E6E43` → `#B6C896` |
| `--indigo` | `#5B6B8A` | `#92A2C2` | `#44516D` → `#AAB8D4` |
| `--gold` | `#B89968` | `#D6BA86` | `#9A7D4E` → `#E2CA9E` |

### Hairlines — warm cream at low alpha over walnut
`--line-faint` cream 7% · `--line-soft` 11% · `--line` 15% · `--line-strong` 22%.
Same principle as light (ink-at-alpha), inverted to cream-at-alpha.

### Tier tints (lifted pigment over walnut)
### Elevation — deeper, warmer near-black
Shadows rebuild on warm near-black `rgba(8,5,3,…)` at higher alpha than Dawn
(walnut needs more contrast to lift a surface): `--shadow-xs` 0.40 →
`--shadow-pop` up to 0.72. Same layered, negative-spread
structure as light — never a hard black drop.

### Texture & focus
- **Grain inverts.** The Dawn `multiply` grain would vanish on walnut, so Dusk
  swaps `.paper-grain` to a **light fractal under `mix-blend-mode: screen`**
  (opacity ~0.22) — the tooth reads as a faint highlight instead of a shadow.
  `.paper-specks` drops to ~0.10.
- **Focus follows the accent in every theme:** `--ring` is the accent's text cut
  (moss-deep by default), drawn 3px at 50% by every primitive; an invalid field
  rings in `destructive`. Dialogs and sheets dim the page with `bg-black/10`.
- `color-scheme: dark` is set so native form controls and scrollbars follow.

### Do / Don't (Dusk)
**Do** — author against semantic tokens so Dusk is free; trust the lifted `-deep`
pigments for accent text on tints; keep focus rings cream-neutral; let the screen-
blend grain carry the digital paper tooth. **Don't** — reference `--dk-*` directly
in components; reintroduce pure `#000`/`#FFF`; darken pigments for Dusk (they
lift); keep the multiply grain (it disappears).

### Classic themes — the sanctioned exception
`classic-light` and `classic-dark` trade the notebook palette for conventional
neutrals: pure `#FFFFFF` / `#000000` grounds, neutral greys, and no digital paper
grain (both texture overlays are disabled). Use them where the brand look isn't
wanted; the no-pure-white/black rule applies only to Dawn & Dusk. Values live in
the `--cl-*` / `--cd-*` sets.

---

## 4. Typography

<!-- generated:type:start -->
Two voices. **Fraunces** (variable display serif) is the brand voice; **Raleway** does the work.

### Families
- `--font-display`: `"Fraunces", Georgia, serif` — headings, wordmark, captions. `--font-heading` is the same face, behind the `font-heading` utility.
- `--font-sans`: `"Raleway", -apple-system, BlinkMacSystemFont, sans-serif` — body, UI, labels.
- `--font-mono`: `ui-monospace, "SF Mono", Menlo, monospace` — code and token specimens.
- `--font-ui` / `--font-data` — the Intelligent theme's instrument faces (`"Inter"`, `"JetBrains Mono"`); leave them to that theme.

Loaded from Google Fonts by the `@import` at the top of the shipped theme file. Never load the families again under another name: the theme matches them by their literal names. Weights used: **400 / 500 / 600**.

### Fraunces variable axes
- `opsz` 9–144 matches optical size to render size · `SOFT` 0–100 rounds terminals as size grows · `WONK` 0 | 1 is the off-kilter glyph set, **accents only**.
- Presets: `--fraunces-display` (`"opsz" 144, "SOFT" 50, "WONK" 0`) · `--fraunces-accent` (`"opsz" 144, "SOFT" 100, "WONK" 1`, the italic emphasis) · `--fraunces-text` (`"SOFT" 50, "WONK" 0`) · `--fraunces-caption` (`"opsz" 14, "SOFT" 100, "WONK" 0`).
- Every Fraunces text is soft: `h2`–`h6` and `font-heading` text take `--fraunces-text` (optical size follows the render size), `h1` takes `--fraunces-display`, `.fraunces-accent` / `.fraunces-caption` are the exceptions. The base layer applies all of it.

### Type scale
| Token | Size | Line | Use |
|---|---|---|---|
| `--text-2xs` | 0.7rem (11.2px) | inherits | micro labels, tag pills |
| `--text-xs` | 0.75rem (12px) | 133.3% (16px) | meta, eyebrows |
| `--text-sm` | 0.85rem (13.6px) | 142.9% (19.4px) | captions, fine print |
| `--text-base` | 0.95rem (15.2px) | 150% (22.8px) | UI text, buttons |
| `--text-lg` | 1.15rem (18.4px) | 155.6% (28.6px) | lead paragraphs |
| `--text-xl` | 1.5rem (24px) | 140% (33.6px) | card titles |
| `--text-2xl` | 2rem (32px) | 133.3% (42.7px) | sub-headings |
| `--text-3xl` | 3rem (48px) | 120% (57.6px) | section titles |
| `--text-4xl` | 4rem (64px) | 111.1% (71.1px) | page heads |
| `--text-5xl` | 5.5rem (88px) | 100% (88px) | hero display |

### Leading, tracking, rules
- A `text-*` class sets its line height with its size (the Line column, shipped as `--text-sm--line-height` and so on), so bare UI text needs no `leading-*`.
- **Leading roles** — `leading-display` 1.05 (hero and h1 lines) · `leading-heading` 1.2 (h2–h6) · `leading-ui` 1.5 (controls and dense UI text) · `leading-reading` 1.7 (body and long-form copy).
- **Tracking roles** — `tracking-display` −0.03em (Fraunces headings) · `tracking-label` 0.1em (small uppercase labels and badges) · `tracking-eyebrow` 0.15em (eyebrows above a headline).
- Each role is a class and a variable (`leading-reading`, `--leading-reading`). They are named for the text they set: `leading-snug`, `tracking-tight` and `tracking-wide` are Tailwind's own and keep Tailwind's values, so never redefine them. `body` and `h1`–`h6` already carry their roles from the base layer.
- **Headings** — Fraunces at weight 400 (never heavy or bold), tight tracking; `h1` in `--fraunces-display`, every other heading and `font-heading` text in `--fraunces-text`.
- **The one accent word** — italicize exactly one word per headline in the accent (`--accent-pigment-text`, moss by default) with `--fraunces-accent`. Never two.
- **Body / UI** — Raleway 400/500/600; relaxed leading for reading copy.
- **Eyebrows / labels** — Raleway, uppercase, `--text-xs`, `tracking-eyebrow`, `--ink-muted`; the accent variant carries a short leading dash.
- **Captions** — small Fraunces italic in `--ink-muted` with `--fraunces-caption`.
- Sentence case in prose and headings; uppercase only for eyebrows.
<!-- generated:type:end -->

---

## 5. Spacing & layout

<!-- generated:spacing:start -->
A **4px base step** (`--space-1` = 0.25rem). Editorial rhythm — sections breathe.

`--space-0_5` 2px · `--space-1` 4px · `--space-1_5` 6px · `--space-2` 8px · `--space-2_5` 10px · `--space-3` 12px · `--space-3_5` 14px · `--space-4` 16px · `--space-4_5` 18px · `--space-5` 20px · `--space-6` 24px · `--space-7` 28px · `--space-8` 32px · `--space-9` 36px · `--space-10` 40px · `--space-12` 48px · `--space-16` 64px · `--space-20` 80px · `--space-24` 96px

Components sit on `--space-4` / `--space-6`; sections breathe with `--space-24`. In a component write the class (`p-4`, `gap-6`): it compiles to the variable (`padding: var(--space-4)`), so the class and the token are one thing. These steps are the whole scale: a Tailwind step outside it (`p-13`, `p-3.25`) or a bracket (`p-[13px]`) is off the system, and `quill-check` flags it with the nearest step. In hand-written CSS use the variable.

### Sizes
Past the spacing steps, sizes are named for their job: `w-card`, `max-w-page`, `h-frame` (→ `var(--size-card)`). Widths go on `w-`, `max-w-`, `min-w-`, `basis-`; heights on `h-`, `min-h-`, `max-h-`, `size-`. A height is never padding or a width, and Tailwind's `max-w-md` or `w-64` is not Quill's: `quill-check` flags both.

Widths:
- `w-chip` 160px — the longest a source chip gets before its text truncates
- `w-menu` 192px — dropdown menus
- `w-chip-lg` 224px — the longest an attachment chip gets
- `w-rail` 240px — side rails: an app’s left nav, a board column
- `w-panel` 288px — popovers, pickers and list columns
- `w-card-sm` 320px — narrow cards and forms: a minimal sign-in, a short blurb, a search field
- `w-card` 384px — the standard card: sign-in, sign-up, notifications, an order summary
- `w-card-lg` 448px — roomier cards: forms with more fields, a command palette, an activity feed
- `w-card-xl` 560px — wide cards and the text under a headline: settings, FAQ, a cookie banner, a hero’s lead
- `w-measure` 672px — a readable column: a big headline, the AI home
- `w-thread` 768px — a chat thread
- `w-page` 880px — a content page inside the app
- `w-page-wide` 1400px — the marketing page

Heights:
- `h-touch` 44px — the smallest a control gets: the WCAG 2.5.5 touch target
- `h-bar` 56px — a top navigation bar
- `h-area-sm` 128px — a short content area
- `h-area` 224px — a chart, or the most a text field grows before it scrolls
- `h-frame-sm` 480px — a whole-screen block shown on its own, compact (chat, 404)
- `h-frame` 560px — a whole-screen block shown on its own (mail, nav, list-detail, dashboard)
- `h-frame-lg` 640px — a whole-screen block shown on its own, tall (AI chat)

### Layout
Marketing pages sit in `max-w-page-wide` (1400px), app pages in `max-w-page` (880px), a reading column in `max-w-measure` (672px); side padding **48px** on desktop (`px-12`) and **24px** on mobile (`px-6`), vertical section rhythm **96px** (`py-24`; `py-12` on mobile).

### Composition
- Recurring section header: eyebrow → headline (one accent word) → right-aligned italic caption.
- One idea per section: a heading plus one composition (a grid of cards, a table, a form), never a stack of unrelated widgets.
- No hero-metric row above an identical card grid — that is the generic dashboard Quill exists to avoid. Lead with the thing the page is about; let numbers sit inside it.
<!-- generated:spacing:end -->

---

## 6. Effects — radii, elevation, motion, texture

<!-- generated:effects:start -->
### Corner radii
`--radius-xs` 2px · `--radius-sm` 4px · `--radius-md` 6px · `--radius-lg` 8px · `--radius-xl` 16px · `--radius-2xl` 24px · `--radius-3xl` 32px · `--radius-4xl` 40px; `--radius` (0.5rem) is the shadcn base.
Cards use `rounded-xl`, buttons and inputs `rounded-lg`, pills `rounded-full`.

### Elevation
Shadows are ink-tinted, layered and re-cut per theme — never a hard black drop. `--shadow-xs` hairline lift · `--shadow-sm` low surfaces · `--shadow` raised popovers and menus · `--shadow-lg` dialogs · `--shadow-pop` the strongest lifted state. Cards sit flat on the paper with a hairline ring, no shadow.

### Motion
House easing `--ease-out` (`cubic-bezier(0.4, 0, 0.2, 1)`); soft `--ease-soft` (`cubic-bezier(0.22, 1, 0.36, 1)`). Durations `--dur-fast` 0.2s · `--dur` 0.3s · `--dur-slow` 0.5s. Lifts `--lift` (translateY(-4px)) and `--lift-sm` (translateY(-2px)) for hover on interactive surfaces; presses settle 1px down. Nothing bounces, nothing loops; respect `prefers-reduced-motion`.
<!-- generated:effects:end -->

### Texture — the tooth of the page
Two fixed, pointer-events-none overlays give surfaces digital paper grain:
- `.paper-grain` — fractal-noise SVG, inline in the stylesheet, opacity ~0.4, `mix-blend-mode: multiply`. Both layers belong to the Quill site; the theme an app installs carries neither.
- `.paper-specks` — faint radial-dot speck layer, opacity ~0.15.
Place both as fixed siblings in the app shell (skip on dense dashboards).

### States (the interaction language)
Read from the shipped primitives (`src/components/ui/button.tsx`,
`src/components/ui/input.tsx`), not from memory:
- **Hover:** the default (ink) button drops to 80% (`hover:bg-primary/80`);
  `outline` and `ghost` take the muted wash (`hover:bg-muted`); `link` underlines.
  Nothing turns terracotta on hover, and cards do not move.
- **Press / active:** buttons settle 1px down (`active:translate-y-px`).
- **Focus:** a 3px ring in the accent pigment at 50% plus a ring-coloured border
  (`focus-visible:ring-3 focus-visible:ring-ring/50`), the same on buttons and
  inputs. `--ring` follows `data-accent`, so it is moss by default and terracotta
  only when terracotta is the chosen accent. Never hand-set a focus colour.
  In Windows High Contrast (`forced-colors: active`) the browser removes the
  ring, so the theme gives every focused element a 2px outline in the system
  highlight colour instead, in that mode only.
- **Invalid:** `aria-invalid` sets a destructive (terracotta) border and a 3px
  destructive ring at 20%.
- **Disabled:** 50% opacity with pointer events off (buttons) or `cursor:
  not-allowed` (inputs).

### Cards (the recurring object)
`--card` (paper-warm) stock, a 10% ink hairline ring, `rounded-xl` corners, no
shadow and no hover lift — cards are paper, not buttons. Parts in §7.

**One outline rule.** Anything that reads as a card — a `bg-card` surface, a floating
panel, a hand-built tile — takes the Card primitive or its ring, `ring-1
ring-foreground/10`. `border-border` is for structure around content that is not a
card: list, table and Calendar wrappers, and the dashed edge of a dropzone. A
selectable tile keeps `border-border` too, because its checked state swaps the
border for `ring`.

---

## 7. Components

Primitives are **stock shadcn** (Base UI + Tailwind) restyled by the token layer —
Quill does not re-ship its own Button, Card or Input. Apps install them with
`npx shadcn@latest add button …`; the site's copies live in `src/components/ui`
and are what the entries below describe. Quill ships eighteen components of its own
through the registry — `icon` (`registry/lib/icon.tsx`), `tone-badge`
(`registry/lib/tone-badge.tsx`), and the AI kit (`agent-steps`, `ai-badge`,
`ai-button`, `ai-feedback`, `ai-mark`, `ai-message`, `ai-notice`, `ai-popover`, `ai-thinking`,
`approval-card`, `citations`, `model-picker`, `prompt-composer`, `question-card`,
`suggested-prompts`, `usage-meter`) — plus 55 blocks under `registry/blocks`. The
per-component rules live in `public/usage` (one page per name), written once in
`src/usage`.

### Button — `src/components/ui/button.tsx`
Variants: `default` (solid ink — the primary action), `outline`, `secondary`,
`ghost`, `destructive` (terracotta tint), `link` (underlined inline text). Sizes
`xs` / `sm` / `default` / `lg`, plus the square `icon-xs` / `icon-sm` / `icon` /
`icon-lg`. It renders as a link through Base UI's `render` prop. There is no
`href`, `withArrow` or `accent` prop: an arrow is a trailing glyph in the label,
and the accent pigment is never a button fill.
```jsx
<Button size="lg" render={<a href="/storybook/" />}>Open the Storybook <span aria-hidden>→</span></Button>
<Button variant="outline">Read the foundations</Button>
<Button variant="link">Read the journal</Button>
```

### Input — `src/components/ui/input.tsx`
The stock text field: `--input` border, the accent focus ring, the destructive
invalid state. It takes native `<input>` attributes only — a label is a `Label`
(`src/components/ui/label.tsx`) or the `FieldLabel` / `FieldDescription` /
`FieldError` parts of `src/components/ui/field.tsx`, the invalid state is
`aria-invalid`, and multi-line text is `Textarea` (`src/components/ui/textarea.tsx`).
```jsx
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" placeholder="your@email.com" aria-invalid={hasError} />
```

### ToneBadge — registry `tone-badge` → `components/ui/tone-badge.tsx`
The generic uppercase tag pill for app status/tier/label chips — pigment
`tone` (`moss` positive · `gold` caution · `terracotta` attention · `indigo`
informational · `neutral`/`muted` quiet), tinted by default or `solid` for the
strong cue. Two sanctioned sizes, and only these two: `md` (20px, the badge
scale) and `sm` (16px, the count-pill scale). Type stays `--text-2xs` with
`tracking-label` (0.1em) in BOTH sizes — never tighten tracking to shrink a
pill. Hand-rolling `rounded-full … uppercase` spans is a contract violation;
render every tag pill through ToneBadge.
```jsx
<ToneBadge tone="moss" solid size="sm">current</ToneBadge>
```

### Eyebrow — a recipe, not a component
The uppercase tracked kicker above a heading. In blocks it is a plain `<span>`:
`text-xs font-medium tracking-eyebrow uppercase text-ink-muted` for the quiet
section label (as in `registry/blocks/faq.tsx`), or
`text-accent-pigment-text` — the AA text cut of the accent — for the editorial
flavour, optionally with a leading dash. The same class carries a display figure
that should read in the accent (`registry/blocks/stats-band.tsx`). There is no `Eyebrow`
component and none is planned.

### Avatar — `src/components/ui/avatar.tsx`
`Avatar` (sizes `sm` 24px / `default` 32px / `lg` 40px) wraps `AvatarImage` and
`AvatarFallback` (initials in `text-sm` on the muted surface); `AvatarBadge`,
`AvatarGroup` and `AvatarGroupCount` handle status dots and stacks. There are no
`src` or `initials` props on the root and no italic Fraunces fallback.
```jsx
<Avatar size="lg">
  <AvatarImage src="/team/rp.jpg" alt="" />
  <AvatarFallback>RP</AvatarFallback>
</Avatar>
```

### Card — `src/components/ui/card.tsx`
`Card` (`size` `default` / `sm`) with `CardHeader`, `CardTitle`, `CardDescription`,
`CardAction`, `CardContent` and `CardFooter`. Paper-warm stock, a 10% ink hairline
ring, `rounded-xl`, no shadow, no hover lift. Full-bleed media needs no prop: an
`<img>` as the first or last child takes the card's corners and drops the padding
on that edge. There are no `interactive` or `flush` props.
```jsx
<Card>
  <CardHeader>
    <CardTitle>Meeting Mapper</CardTitle>
    <CardDescription>…</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>
```

---

## 8. Iconography

Deliberately **icon-light** — visual interest comes from illustration and type,
not an icon set.
- **Typographic marks as icons:** arrow `→` (CTAs, slides on hover) and middot
  `·` (separator). Use real Unicode glyphs in the brand fonts — prefer over SVG
  icons. No decorative or ornamental marks.
- **No icon font, no emoji** in the source.
- **UI icons: Material Symbols (Outlined, weight 400)** — the actual Google
  symbols, rendered as inline SVG through the source-owned `<Icon>` component
  (`src/components/ui/icon.tsx`), generated from the official `@material-symbols/svg-400`
  package. The regular 400 weight gives glyphs solid presence at UI sizes; the
  typographic marks above are still preferred where they read naturally.

---

## 9. Imagery & assets

**Illustrations** — when illustrations are used, source them from
https://getillustrations.com/. Selections always match page-level or content-level
context. Imagery and illustrations are never mixed — it's one or the other.

For a needed placeholder, use a `--paper-deep` block.

---

## 10. Voice & content

Warm, unhurried, and obsessed about the quality of design craft. **"We"** for the agency, **"you"**
for the user and reader. Metaphors of editorial work, collecting, curating, and keeping.
Short, punchy declaratives, with the occasional fragment for rhythm (*"Building for
quality. One customer at a time."*).
- **Casing:** sentence case throughout. Uppercase reserved for eyebrow labels.
- **Emphasis:** at most one emphasized word per headline, italic + moss.
- **Documentation pattern:** state the decision, then the reason for it. No
  hedging, no second-person coaching, no hype or hype punctuation, no emoji.
Sample microcopy: headline *"Products, crafted with **intelligence**."* · CTA *"Our services"*
· note *"Quality design is our specialty."*

---

## 11. Principles, Do / Don't

<!-- generated:principles:start -->
Three principles name the point of view; the rules underneath are how they show up in code.

- **Paper first.** Every surface, a texture you can almost feel, with a typeset that has an unhurried editorial rhythm. Everything sits on digital paper (`--paper`, `--paper-warm`, `--paper-deep`); warmth comes from the material, not decoration.
- **One italic word.** Emphasis is earned. A single accented italic per headline — never two, never shouted.
- **A gentle settle.** Hovers lift, presses set down. Nothing bounces, nothing loops, nothing hurries you along.

### Rules
- **Author against semantic tokens** — `--paper`, `--ink`, `--card`, `--primary`, `--ring` and the rest; never the per-theme `dk-*` / `cl-*` / `cd-*` / `int-*` sets and never a raw hex. That is what makes every theme free.
- **Ink for actions, accent for meaning** — primary actions are ink (`--primary`). The accent pigment (moss by default; `--accent-pigment-text` for text, `--link`, `--ring`) is reserved for the one accent word, eyebrows, links and the focus ring. Terracotta is the danger pigment: never a hover colour, and a focus ring only when it is the chosen accent.
- **Reach for a block before building one** — the registry ships 55 composable blocks (activity feed, empty state, page header, theme selector, data table…). A hand-built copy drifts from the AA-checked tokens the moment it lands. When no block or primitive fits, compose from primitives and semantic tokens within these rules and name the gap, rather than inventing a new pattern.
- **Made for people** — WCAG 2.1 AA is a feature, not a checkbox: text cuts clear 4.5:1 on every theme ground, interactive borders clear 3:1, charts use the CVD-safe chart tokens in fixed order, motion has a reduced-motion path.
- **Content** — sentence case everywhere (uppercase only for eyebrows); state the decision, then the reason; no hype punctuation, no emoji.

### Do / Don't
**Do** — sit everything on digital paper; reserve the accent for the one accent word, eyebrows, links and the focus ring; use ink for primary actions; warm layered shadows; Fraunces light and tight for headings.

**Don't** — pure white or pure black in Dawn and Dusk (the Classic themes use them by design); a hand-set focus colour (`--ring` belongs to the accent axis); terracotta on hover; blue-purple gradients; any gradient except the AI gradient in its seven placements; glassmorphism or purple-glow dark mode; emoji; heavy or bold Fraunces; tight body leading; bouncy or looping motion.

**The AI gradient** is the only gradient Quill ships and means one thing: AI. Ember (gold → terracotta → indigo), fixed across accents, via the `ai-*` utilities only. Seven placements: the AI mark; the composer's edge; a top-to-bottom wash on an AI panel or popover; motion while AI works; one soft glow on an AI home page; gradient text on an AI feature's heading; the fill of an AI usage meter. Never on answer text; Accept, Replace or Send; charts; status colours; anything not AI. One of `ai-edge` / `ai-edge-working` per element (same background); the edge fills with `--background`, so use it on page-background surfaces.

### Anti-references
- The generic SaaS/shadcn default look: white cards, blue accents, hero-metric rows, identical card grids.
- The cold gray enterprise dashboard — a dashboard where a notebook belongs.
- Loud startup maximalism: neon gradients, glassmorphism, purple-glow dark mode.
<!-- generated:principles:end -->
