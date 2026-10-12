# Quill Design System

An editorial design system for digital products — low-contrast warm neutral grounds,
ink-toned type, Fraunces display, and a narrow accent palette reserved for meaning.

Built by [Craftwell](https://github.com/craftwell-ai). Live at
**[quilldesignsystem.com](https://www.quilldesignsystem.com)** · component catalog at
**[/storybook](https://www.quilldesignsystem.com/storybook/)**.

## Using Quill in an app

Quill is a self-hosted [shadcn registry](https://ui.shadcn.com/docs/registry), not an npm
package. Items are **copied into** your app at install time, so nothing upstream can change
under you — and nothing arrives until you pull it.

```bash
npx shadcn@latest init -d
```

Quill is listed in [shadcn's registry directory](https://ui.shadcn.com/docs/directory), so the
`@quill` namespace works with no configuration. To pin the URL yourself instead, add it to
`components.json`:

```json
{ "registries": { "@quill": "https://www.quilldesignsystem.com/r/{name}.json" } }
```

Then install the theme, and any blocks you want:

```bash
npx shadcn@latest add @quill/quill          # the token layer (registry:base)
npx shadcn@latest add @quill/agent-rules    # rules for the app's AI agents (.claude/rules/quill.md)
npx shadcn@latest add @quill/tone-badge     # a component
npx shadcn@latest add @quill/dashboard      # a block
npx shadcn@latest add @quill/example-app-page   # a whole page composed from blocks (also marketing, auth)
npx shadcn@latest search @quill             # list everything
```

**Primitives are stock shadcn, restyled by the token layer.** Quill does not re-ship its own
copies of Button, Card or Dialog — install those from shadcn as usual and the theme restyles
them. Quill ships the theme, eighteen components (`agent-steps`, `ai-badge`, `ai-button`, `ai-feedback`, `ai-mark`, `ai-message`, `ai-notice`, `ai-popover`, `ai-thinking`, `approval-card`, `citations`, `icon`, `model-picker`, `prompt-composer`, `question-card`, `suggested-prompts`, `tone-badge`, `usage-meter`), and 55 composable blocks.

**What Quill expects underneath.** Quill's pieces are written for the Base UI flavour of the
stock shadcn components (the `base-*` styles; this repo uses `"style": "base-nova"` in
`components.json`), on `@base-ui/react` 1.8.0 or newer. The AI pieces also need the Quill
theme (`@quill/quill`): it carries their `--ai-*` colours and `ai-*` utilities, and installing
an AI piece does not pull the theme in for you. Without it the gradients are not drawn — AI
text keeps the plain ink colour around it, and the sparkle and the usage ring come out black.

Machine-readable summary for coding agents: **[llms.txt](https://www.quilldesignsystem.com/llms.txt)**.
Per-component usage guides live at `/usage/<name>.md`.

Quill is released under the [MIT License](LICENSE).

## Connect your AI tool

Any MCP client can read Quill's component guides live. Add this server:

```json
{ "quill": { "url": "https://www.quilldesignsystem.com/mcp/" } }
```

Keep the trailing slash. Clients that only run local commands can bridge with
`npx -y mcp-remote https://www.quilldesignsystem.com/mcp/`. Tools:
`find_component` (describe the job, get the best-fitting components),
`get_component` (full usage guide + install command), `get_setup`, and
`get_foundations`. Claude Code apps already get the same guidance from
`@quill/agent-rules`.

## Theming

Five themes, set with `data-theme` on `<html>`:

| `data-theme` | Name | Ground |
|---|---|---|
| *(unset)* or `light` | Dawn | warm paper |
| `dark` | Dusk | walnut |
| `classic-light` | Classic Light | pure white |
| `classic-dark` | Classic Dark | pure black |
| `intelligent` | Intelligent | cockpit near-black |

Four accents, set independently with `data-accent`: `moss` (default), `terracotta`, `indigo`,
`gold`. The accent drives links, eyebrows, focus rings and accent italics. The two attributes
are separate axes — a dark ground and an accent choice do not constrain each other.

Every text cut is checked against **WCAG 2.1 AA** (4.5:1) on every theme ground, and
interactive borders against 3:1, by the token test suite.

## Working on Quill itself

Requires Node 24.

```bash
npm install
npm run storybook          # the component catalog, localhost:6006
npm run dev                # the marketing site, localhost:3000
```

Tests and checks:

```bash
npm run test:tokens        # token contracts, WCAG, generator output
npm run test-storybook     # every story rendered + axe accessibility checks
npx tsc --noEmit
npm run lint
```

Design files: the Paper file "Quill Design System" mirrors the code, one page per component,
block and template, redrawn from Storybook with `npm run paper:sync` (Paper open on a Mac).
Code is the source; Paper is never edited by hand. See `paper/README.md`.

### The generated layer

`src/tokens/quill.tokens.mjs` is the single source of truth for colour, type, spacing,
radius, shadow and motion. Everything below is generated from it and committed — CI
regenerates all of it on every PR and fails on any diff, so never hand-edit these:

| Command | Writes |
|---|---|
| `npm run build:tokens` | `src/app/globals.css`, `registry/themes/quill.css`, `src/tokens/generated` |
| `npm run build:icons` | `src/components/ui/icons.core.mjs`, per-icon modules, the `IconName` union |
| `npm run build:usage` | `public/usage/*.md`, registry `docs`/`description` fields |
| `npm run build:agent-rules` | `registry/agent-rules/quill.md` — the rules file the `@quill/agent-rules` item installs into apps |
| `npm run build:registry` | `public/r/*.json` |
| `npm run build:llms` | `public/llms.txt`, and the generated spans in `DESIGN.md` |

One generated file sits outside that chain: `scripts/icons.manifest.mjs`, the list of ~1000
popular Material Symbols that `build:icons` lazy-loads when Google's metadata file is not on
disk. Regenerate it on demand — download the metadata, then
`npm run build:icon-manifest -- /tmp/ms-meta.json` followed by `npm run build:icons`.

Component guidance is written once per component in `src/usage/<name>.usage.mjs` and flows
from there into Storybook, the published usage pages, the registry item, and llms.txt.

### Conventions

- Every feature or fix PR bumps `version` in `package.json` and adds a `CHANGELOG.md` entry.
  Tagging and the GitHub release happen automatically after merge.
- `main` is protected; changes land through a PR with CI green.
- Scheduled bots handle dependency bumps, generated-file drift, releases, and pushing each
  release out to the apps built on Quill. See `scripts/DRIFT-AUDIT.md`.
