// Install-time docs for the base `quill` item — the one item every consuming app
// installs. The shadcn CLI prints an item's `docs` field on `add`, so this is the
// single moment Quill can hand an app its theming contract. It shipped with no
// `docs` at all, which is why apps were never told that `--yes` does not update a
// changed file (only `--overwrite` does) and silently skips instead.
//
// Generated, never hand-written: the theme and accent lists come from
// src/tokens/themes.mjs and the token source, so a new theme or a changed default
// accent reaches installers without anyone remembering to edit prose. DESIGN.md's
// own Activation section had drifted out of date by one whole theme — that is the
// failure mode this avoids.

import { ALL_MODES, DEFAULT_MODE, DEFAULT_ACCENT } from '../tokens/themes.mjs'
import { tokens } from '../tokens/quill.tokens.mjs'

export const LLMS_URL = 'https://www.quilldesignsystem.com/llms.txt'

export function accentNames() {
  return Object.keys(tokens.accents)
}

export function chartSeriesCount() {
  return Object.keys(tokens.color.chart.series).length
}

/**
 * One paragraph-per-topic string. Kept as prose rather than markdown headings
 * because the CLI prints it into a terminal, not a renderer.
 */
/** The theming contract as separate paragraphs (the rules file renders them as bullets). */
export function themeDocsParagraphs() {
  const themes = ALL_MODES.map((m) =>
    m.attr === DEFAULT_MODE.attr
      ? `unset (or data-theme="${m.attr}") → ${m.label} (default)`
      : `data-theme="${m.attr}" → ${m.label}`,
  ).join(' · ')

  const accents = accentNames()
    .map((a) => (a === DEFAULT_ACCENT ? `${a} (default)` : a))
    .join(' · ')

  return [
    `Themes — set data-theme on <html>: ${themes}. ${ALL_MODES.length} themes in total.`,

    `Accents — set data-accent on <html>, independently of the theme: ${accents}. The accent drives links, eyebrows, focus rings and accent italics. The two axes are independent.`,

    `Runtime contract — the theme-selector block owns both attributes: after hydration it reads localStorage ("quill-theme", "quill-accent") and stamps <html>. Prerendered markup is always ${DEFAULT_MODE.label} + ${DEFAULT_ACCENT}, so first paint matches the server.`,

    `Charts — use the chart tokens (--chart-series-1..${chartSeriesCount()}, the sequential and diverging ramps), never raw pigments. Assign series colours in that fixed order and never reorder or cycle survivors when a filter drops one: the order keeps the palette distinguishable under all three dichromacies.`,

    `Fonts — Raleway (body) and Fraunces (display) load through the theme file's @import; no next/font. Never load them again under another name: the theme matches literal names.`,

    `Wiring — the CLI install merges the theme into your Tailwind stylesheet. A theme FILE must be imported from inside that stylesheet, as its LAST line — \`@import "./quill-theme.css"\` — never from layout.tsx, where every Quill utility is dead. Last, because the last definition wins: shadcn init writes its own dark line and radius lines (\`--radius-md: calc(var(--radius) * 0.8)\`), and imported above them, they beat Quill's.`,

    `dark: utilities — stock primitives' dark: tweaks follow Quill's dark themes (and the .dark class) once the theme is wired; nothing to add by hand.`,

    `Self-check — after changing UI, run \`node scripts/quill-check.mjs\` (install once: \`npx shadcn@latest add @quill/check\`) and clear every finding: stock colours, raw colours, bracket values where a token exists, retired names, dead classes. An exception: \`// quill-check: allow <rule> — <why>\` on the line above.`,

    `Updating — re-run with --overwrite, not --yes: on a file you have changed, --yes prompts in a terminal and silently skips when non-interactive.`,

    `Full machine-readable reference for agents: ${LLMS_URL}. Per-component usage guides at /usage/<name>.md.`,
  ]
}

export function renderThemeDocs() {
  return themeDocsParagraphs().join(' ')
}
