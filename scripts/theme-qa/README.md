# Theme QA — every story, with axe, under a non-default theme

`npm run test-storybook` renders every story and runs axe against it — in Dawn only, because
the preview's theme global defaults to Dawn. This harness runs the same suite with the theme
forced, so Dusk, Classic Light, Classic Dark and Intelligent get the same check.

```bash
QUILL_THEME=dark npm run test-storybook:theme          # one theme (dark | classic-light | classic-dark | intelligent)
for t in dark classic-light classic-dark intelligent; do QUILL_THEME=$t npm run test-storybook:theme; done
node scripts/theme-qa/summarise.mjs                    # failing stories, element, measured contrast
```

Reports land in `.theme-qa/<theme>.json` (gitignored). Each story also
asserts that the wrapper really carries the requested `data-theme`, so a run that quietly
rendered Dawn fails instead of passing for the wrong reason.

How the theme is forced: `storybookTest({ initialGlobals: { theme } })` — the plugin's own
option. Passing `initialGlobals` or a `globalTypes.defaultValue` through
`setProjectAnnotations` does **not** override it (measured on Storybook 10.6).

First sweep, 2026-09-22 (v0.10.11): 395 stories × 4 themes. Classic Light clean; Classic
Dark 1 (a story's `text-blue-600`); Dusk 2 and Intelligent 11, all one cause — muted ink on
the dark field wash (`dark:bg-input/30`) under 4.5:1. Fixed in the token, guarded in
`src/tokens/quill.tokens.test.mjs`.
