# `@quill/check` — a self-check agents run in their own app

**Decided 2026-09-23.** Ryan chose this over the nightly visual diff (CRA-224) as the next
agent-readiness item, with option A on bracket values (token-shaped only).

**Revised 2026-10-16 (1.28.0): Quill owns the size scales.** The theme now points every
spacing, radius, type and border-width utility at a Quill variable (`p-4` →
`padding: var(--space-4)`, `rounded-md` → `var(--radius-md)`), so what an inspector shows is a
Quill token. The original reasoning below — "Quill does not own composition; its spacing scale
equals Tailwind's, so there is no better answer to give" — no longer holds: Quill's steps are
its own list (17 Tailwind steps plus `3.5`), Tailwind still compiles every step outside it
(`p-13`, `p-3.25`) and every bracket, and no theme setting can stop that (measured: removing
`--spacing` stops `p-13` but also kills `p-0` and every off-scale class already in use, and
`border-13` and brackets compile whatever the theme says). So the check enforces the scale:
rules 6 and 7 below.

**Revised 2026-10-17 (1.29.0): widths and heights too.** 1.28.0 listed them as size gaps (file
and line, never failing) while Quill had no scale for them. Ryan approved one drawn from the 89
values in use: 13 widths and 7 heights named for their job (`w-card`, `max-w-page`, `h-frame`;
values in `tokens.size`, jobs in `src/usage/sizes.mjs`), plus the spacing step `4.5`. Quill's code
moved onto it, and the gaps became findings.

## Why

Quill's rules exist only as reading material: DESIGN.md, `llms.txt`, and the agent-rules file
installed into every app. Nothing tells an agent when it broke one. It writes `bg-white` for
`bg-card`, `text-[13px]` for `text-sm`, a retired alias, or a class that resolves to nothing on
the app's channel — and the screen looks nearly right. Agents comply with rules they can
*test*, not rules they can *read*. This is the test.

## What it is

One dependency-free ESM script, installed into an app like a block:

```
npx shadcn@latest add @quill/check      →  scripts/quill-check.mjs
node scripts/quill-check.mjs            →  findings, exit 1 if any
```

Registry item `check`, `registry:file`, target `~/scripts/quill-check.mjs`, declared in
`registry.json` beside `agent-rules` with `title`, `description` and install-time `docs`.

### Output

Grouped by file, one line per finding, one fix each; a summary line; exit code 1 when any
finding is not allowed. `--json` prints `{ findings: [{ file, line, col, rule, class, fix, allowed }],
summary }` for tools. `--quiet` prints the summary only.

```
app/pricing/page.tsx
  14  bg-white            palette   → bg-card (a raised surface) or bg-background (the page ground)
  22  text-[13px]         bracket   → text-sm
  40  text-indigo-brand   retired   → text-indigo (renamed in 0.9.60)

3 findings · 1 allowed · 4 layout sizes not checked
```

### What it scans

Source files under the app root: `**/*.{tsx,jsx,ts,js,mdx,html,css}`, skipping `node_modules`,
`.next`, `dist`, `build`, `out`, `storybook-static`, `public`, and — by default — `components/ui/`
(stock shadcn primitives, restyled by tokens, never edited; `--include-ui` scans them too).
`--dir <path>` (repeatable) narrows the scan. Class candidates come from every string literal
in a file (the same extraction `consumer-reachability.test.mjs` uses), split on whitespace and
on `${…}` boundaries, keeping tokens shaped like a Tailwind utility with a known prefix
(`bg-`, `text-`, `border-`, `ring-`, `font-`, `rounded-`, `shadow-`, `leading-`, `tracking-`,
`fill-`, `stroke-`, `from-`, `to-`, `via-`, `outline-`, `decoration-`, `divide-`, `placeholder-`,
`caret-`, `ease-`, `duration-`, and Quill's own class names), plus the spacing, size and
border-width utilities (`p-`, `m-`, `gap-`, `space-`, `inset-`/`top-`…, `translate-`, `w-`,
`h-`, `size-`, `min-`/`max-`, `basis-`, `border-N`, `ring-N`, `outline-N`, `divide-N`) when a
value follows the dash — a number, a bracket or a size word — so `p-13` is read and `top-level`
is not. (Before 1.28.0 those prefixes were never read, so `w-64` and `p-13` reached no rule.)
A bare `rounded` counts only among other classes. Variants (`md:`, `hover:`,
`dark:`, `data-[…]:`, `group-…:`) are stripped before rules 2–5; rule 1 sees the whole class.

### Rules (v1) — every finding carries a fix

| # | id | Flags | Fix text |
|---|---|---|---|
| 1 | `unresolved` | a candidate class that produces **no CSS in this app** | one of: "looks like a typo of `x`" (nearest Quill utility by edit distance ≤ 2), "retired name — use `y`" (rule 5 wins when both match), or "Quill's theme is not wired into Tailwind here — `font-heading`, role classes and status classes will all be dead; import the theme from inside the stylesheet that contains `@import "tailwindcss"`" when ≥ 3 known Quill utilities fail together |
| 2 | `palette` | Tailwind's stock colours: `white`, `black`, and any numbered shade (`gray-500`, `red-600`, `indigo-500`…) behind a colour prefix; plus `font-serif` | the Quill roles for that job, by hue and prefix (table below), each with its intent line from `roles.mjs`; `font-serif` → `font-heading` |
| 3 | `raw-color` | hex (3/4/6/8 digits), `rgb()`, `hsl()`, `oklch()`, `oklab()` in component source — class strings, inline `style`, SVG `fill`/`stroke`/`stopColor` | the nearest role or pigment by name; brand marks use an allow (below) |
| 4 | `bracket` | a bracket value on a property Quill has tokens for: colour prefixes, `text-` (size), `leading-`, `tracking-`, `rounded-`, `shadow-`, `font-`, `ease-`, `duration-` — including `text-[var(--x)]` when `x` has a utility | the token utility: exact match by value when one exists (`text-[13px]` → `text-sm`, `tracking-[0.15em]` → `tracking-eyebrow`, `text-[var(--accent-pigment-text)]` → `text-accent-pigment-text`), else the scale to choose from |
| 5 | `retired` | Quill's deprecated names: `indigo-brand`, `indigo-brand-deep`, and `var(--x)` for the 11 retired variables in `tokens.retired` (gone from the CSS since 0.13.0) | the current name, and the version that retired it |
| 6 | `scale`, `bracket` | a step outside Quill's scales: spacing (`p-13`, `p-3.25`, `-mt-13`), border/ring/outline width (`border-5`), type (`text-6xl`–`9xl`, Tailwind's own), bare `rounded`; and a bracket length on a spacing or border-width utility (`p-[13px]`, `gap-[22px]`, `border-[3px]`, `p-[var(--space-4)]`) | the steps either side with their size (`p-13` → `p-12 (48px) or p-16 (64px)`), or the exact step when the bracket is one (`border-[3px]` → `border-3`) |
| 6 | `scale`, `bracket` (widths and heights, 1.29.0) | a width or height that is neither a spacing step nor a size step of its kind: a Tailwind step (`w-64`), Tailwind's width scale (`max-w-md`, `max-w-prose`), a bracket length (`w-[317px]`); a height step used as padding or a gap (`p-frame`) or as a width (`w-frame`) | the steps either side, spacing and size together (`w-64` → `w-rail (240px) or w-panel (288px)`), the exact one when there is one (`max-w-md` → `max-w-card-lg`, the same 448px). Before 1.29.0 these were `size-gap`: listed, never failing |
| — | `radius-override` | Quill's theme is in the app's stylesheet, but what `rounded-*` compiles to there is not Quill's: a radius line defined on shadcn's `--radius` (`--radius-md: calc(var(--radius) * 0.8)`, what `shadcn init` writes) wins over Quill's, or a `--radius` that is not Quill's comes after the theme. Read from the compiled CSS, like `dark-variant`. Added 1.28.0: a fresh app with the theme file imported below the dark line, as the docs then said, rendered `rounded-xl` at 14px instead of 16px, silently | the line, what it renders against Quill's value, and the fix: delete it, or make the theme import the last line of the stylesheet |
| 7 | `inline-style`, `css-value` | a length typed by hand on padding, margin, gap, an offset, radius, font size or border width: in `style={{ … }}` written in place (`padding: 13`) or in an app `.css` file (`padding: 13px`), and `@apply` classes through rules 2–6 | the Quill variable per length, `13px → var(--space-3) (12px, the nearest step)`. Zero, and values built from `var()`/`calc()`, are left alone |

Not flagged, counted: bracket values no token could replace — not a length (`w-[calc(100%-2rem)]`,
`h-[1lh]`, `max-w-[80%]`) — and brackets on layout properties with no Quill scale (`grid-`,
`col-`, `row-`, `aspect-`, `z-`, `order-`, `flex-`), and `bg-[url(…)]`.

Not flagged at all: `dark:` (the shipped theme carries the variant); `0`, `px`, `auto`, `full`,
`screen`, fractions and the other size words; the theme file itself (`quill-theme.css`, or any
stylesheet carrying Quill's `@quill-tokens` marker) and, in any stylesheet, custom-property
definitions and `@theme` blocks — those are the token definitions, so a stylesheet the CLI merged
Quill into scans clean; a style object built outside `style={{ … }}` (the check reads text, not
values); stock primitives under `components/ui/`; `font-mono` (Quill defines it); raw colours in
`.css` files (theme files hold them; not yet checked).

**Palette fix table** (prefix × hue → roles). bg: `white` → background | card; `black` →
foreground; greys → muted | secondary; red/rose → destructive; green/emerald/lime → moss;
blue/sky/cyan → indigo | info; yellow/amber/orange → gold | warning; violet/purple/fuchsia/pink →
"no Quill pigment — pick a role by job". text: `white` → primary-foreground | card; `black` →
foreground; greys → muted-foreground | foreground; red → destructive; green → success;
blue → info | link; yellow → warning. border/ring: greys → border | input | ring. Bare `indigo`,
`teal`, `moss`, `terracotta`, `gold` are Quill pigments and pass.

### Exceptions

A comment on the same line or the line above (in a stylesheet: the line above a declaration,
or above a selector to cover its whole block):

```tsx
{/* quill-check: allow raw-color — Google brand mark */}
<path fill="#4285F4" … />
```

`allow <rule-id> — <reason>`; the reason is mandatory (an allow without one is itself a
finding). Allowed findings are printed in the summary count and listed under `--json`, never
hidden.

### Resolution: how rule 1 knows what is real

The script loads the app's own Tailwind v4 (`createRequire(cwd)('tailwindcss')`), finds the
entry stylesheet (`--css <path>`, else the first of `app/globals.css`, `src/app/globals.css`,
`styles/globals.css`, `src/styles/globals.css` containing `@import "tailwindcss"`), compiles it
with `compile(css, { base, loadStylesheet })`, builds all candidates in one call and treats a
candidate as resolved when its escaped class selector appears in the output. Exact, zero
maintained lists, and the file-channel trap surfaces as "theme not wired" rather than a typo.

Fallback when `tailwindcss` cannot be loaded or no entry is found: rules 2–5 still run (they
are pure text rules); rule 1 is skipped and the summary says why ("run from the app root, or
pass `--css <entry>`"). A guessed static list would flag real classes the app defines itself —
a check that is sometimes wrong is a check agents learn to ignore.

### Generated, guarded, documented (quill-ds side)

- `scripts/build-check.mjs` renders `registry/check/quill-check.mjs` from
  `scripts/check/quill-check.template.mjs` plus data from the token source and `roles.mjs`:
  retired names with versions, the palette-fix table's role intent lines, Quill utility names,
  token value → utility maps for rule 4 (type sizes, leading/tracking, radius, shadow). Same
  single-source rule as agent-rules and `llms.txt`; `npm run build:check` sits in the regenerate
  chain after `build:usage`.
- `scripts/quill-check.test.mjs`: (a) the generated file is in sync with its sources; (b) the
  checker runs **clean** on `registry/blocks`, `registry/lib`, `registry/examples` against the
  site's Tailwind entry (`kanban.tsx:26` `text-[10px]` → `text-2xs` is the first fix this
  forces, mirrored to Figma and re-stamped); (c) a fixture at `scripts/check/fixture.tsx`
  holding one of each violation plus one allow yields exactly the expected findings; (d) with Tailwind
  unavailable, the fixture yields the same rule 2–5 findings and a printed "rule 1 skipped" notice.
- `registry.json` gains the `check` item; `src/usage/theme-docs.mjs` and the agent-rules file
  gain one line: "after changing UI, run `node scripts/quill-check.mjs` and clear every
  finding"; `llms.txt` quick start mentions it; CHANGELOG + version bump (minor: 0.11.0 — a
  new item in the public registry).

### Not in v1

Auto-fix (`bg-white` may mean card or page — the agent decides). Version staleness
(library-sync owns updates). Structural detections (hand-built cards, raw `<button>`) — the
pattern-scan bot's territory; a v2 can borrow its detectors. Icon sizes passed as a number
(`<Icon size={18}>`): props are not classes, so the check cannot read them yet.

### Success

An agent that installs Quill, runs the check after each UI change and clears it ends up with
zero stock colours, zero raw colours, zero bracket values where a token exists, zero spacing,
radius, type or border values off Quill's scales, zero retired names and zero dead classes —
without reading a single doc.
