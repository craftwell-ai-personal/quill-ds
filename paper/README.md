# Quill in Paper

Quill's components, blocks and page templates, drawn into the Paper file **Quill Design System** by script and kept in step with the code.

Paper is Quill's design file; Figma was retired on 2026-10-11 and is not kept in sync any more. Code is the source. Paper is a picture of it that a designer can open, measure and copy from. **To change what Paper shows, change the code and re-run the sync.**

**Every page in this file belongs to the sync. Design in your own Paper file and copy frames from here.**

- Anything drawn inside a generated artboard is erased the next time that piece is synced.
- A page you add to this file is left alone: its name, its place and its content. But a page cannot be moved by script, so yours may end up sitting between two generated pages.
- An artboard you add to a generated page is left alone too, and the sync notes that it is there.

## What is in the file

| Page | What it holds |
|---|---|
| `Foundations` | Every token as Paper holds it: colour swatches with their names and values, the AI gradient, the data-series colours, the type scale, spacing and radius. |
| `❖ <Name>` | One page per component (Button, Dialog, Usage Meter …), A to Z. |
| `◆ <Name>` | One page per block (Hero, Pricing, Conversation History …), A to Z. |
| `▣ <Name>` | One page per page template (App Page, Auth Page, Marketing Page). |

Each page has one artboard (Paper's word for a frame on the canvas), 1440 wide, laid out the same way every time:

1. a header: "Quill · Component", the name, and the one-line summary from the piece's usage notes
2. one section per **story** (a named example of the piece in Storybook, such as "All Variants" or "Disabled"), with the piece drawn under the section title

A piece that is closed until you use it (a dialog, a menu, a tooltip) is drawn **open**: its trigger on the left, the open panel beside it.

The layers are named after the code (`button`, `usage-meter`, `chat-row`, `icon`), and colours, type, spacing and corner radius are bound to **tokens** (named values), so the inspector reads `var(--color-card)` where the code says `bg-card`.

### Which stories get drawn

A rule, so nobody keeps a list for 130 pieces:

- **Always** the piece's main story.
- **Plus** every other story that simply renders a state. A story that needs a script to reach its state (Storybook marks it as having a "play function") is a test, not a design, and is left out.
- **Never** the docs page, Do/Don't pairs, `Dark` stories (the file is one theme), or stories tagged `!autodocs`.
- At most 8 per page.

A story with a play function is read at its **end state**, after the play has finished. A story that ends in an error is not drawn: the piece is recorded as failed instead.

For Quill's own AI components and blocks nearly every story has a play function, so those pieces have hand-picked lists of the stories whose end state is a distinct look (Streaming, Stopped, Error state …).

Exceptions live in one small file, `scripts/paper/pieces.config.mjs`: `include` or `exclude` a story, say how to `open` an overlay, or give a piece a `declined` reason so it gets no page.

## How it stays in step

Three commands, run on this Mac. All of them start their own Storybook; the first two need the **Paper desktop app open**.

| Command | What it does |
|---|---|
| `npm run paper:sync` | Re-draws what changed: pieces whose code moved since they were drawn, new pieces, pieces that failed last time; tokens and Foundations when the token source changed. `-- --all` re-draws everything, `-- --only button,faq` re-draws those. `-- --prune` also deletes **every** token in the Paper file that is not Quill's, including any added by hand. |
| `npm run paper:check` | Reads Paper back and compares it with Storybook (below). `-- --only …` narrows it. Exits 1 when something got worse. `-- --accept --only button` records what it measured for those pieces as the accepted baseline (`--accept --all` for everything, on purpose); a story whose text does not match is never accepted without `--force`. |
| `npm run paper:status` | Lists what is stale, pending, in error or declined. Works anywhere: it only reads files. `-- --record-pending` brings the record in line with the code without Paper (see below). |

A full sync of everything takes about 20 minutes; a normal run touches a handful of pieces and takes under a minute.

### Why this runs on a Mac and not on GitHub

Paper has no service a server can call. The only way in is the desktop app, which answers on this machine while it is open. GitHub's machines cannot reach it. So the split is:

- **On this Mac:** drawing into Paper, and comparing Paper with Storybook.
- **On GitHub** (every pull request, part of `npm run test:tokens`): the record is complete and well-formed. Every component, block and template must have an entry in `paper/sync-state.json` (drawn, `pending`, or `declined` with a reason), and every story the record names must still exist.

**A piece being out of date does not fail the build.** A bot that bumps a dependency cannot re-draw Paper, so "stale" is a to-do for `paper:status` to show and `paper:sync` to clear, not an error.

**When the GitHub check fails on your pull request**, one command fixes it, and it needs no Paper: `npm run paper:status -- --record-pending`, then commit `paper/sync-state.json`. It handles each case a code change can cause:

- you added a component, block or template: it is recorded as waiting to be drawn
- you renamed or deleted a story that Paper shows: the story is dropped from the record and the piece waits to be redrawn
- you deleted a piece: it leaves the record, and its drawing is queued for removal
- you declined a piece in the config (or un-declined one): the record follows

Nothing in Paper changes until the next `npm run paper:sync` on the Mac with Paper open, which draws what is waiting and removes what was queued.

### What the check compares

For every story of every drawn piece:

- **Text.** The text layers in Paper, in order, are exactly the text the story shows.
- **Values.** For the first text, the first button and the first filled surface: colour, type size, line height, weight, typeface, padding, radius and border in Paper equal what the browser computed, after resolving Paper's tokens. This proves the tokens are bound and hold the right values.
- **Picture.** Paper's export of the layer against a screenshot of the story, both at 2x, compared pixel by pixel, with a tolerance for font rasterisation (`scripts/paper/png-diff.mjs`). A three-panel strip (Paper, Storybook, difference) is saved per story under `.paper/strips/`.

Pictures never match exactly (see "Known differences"), so each story has an **accepted** difference in `paper/visual-baseline.json`. A story *regresses* when its picture is more than 1.0 point worse than accepted, a size drifts more than 8px, or text or a value that matched stops matching. A story with no accepted number yet is reported as "without a baseline" and is not a failure.

Paper saves exports into your **Downloads** folder; a script cannot choose another place. The check reads each file and deletes it straight away. It only ever deletes the one exact file Paper said it wrote for that export, and only when that file is in Downloads, carries the exported layer's own name (each story's layer has a unique one), and was created after the export was asked for. It never deletes by pattern. A file it cannot prove is its own is left where it is and named at the end of the run.

### What Paper keeps on its servers

The Paper file lives in Paper's cloud, like any Paper file. Two things are worth knowing:

- **Story images are uploaded.** When a page is drawn, the pictures in its stories (avatars, card photos, up to about 1.5 MB each) are sent to Paper as data and stored in Paper's own storage. All images in Quill's stories are sample content.
- **Text is whatever the stories say.** The sample names, emails and figures in the stories are in the file.

## The daily check

A job on this Mac that does the sync and the check once a day and opens a pull request when something changed.

**What it does each day**

1. Works in its own copy of the repository (in `~/Library/Application Support/quill-paper-sync/`), brought up to `main`. It never touches the folder you work in.
2. If Paper is not open, it stops quietly. That is a normal day, not a failure. After 7 days in a row of that, it says so in its log and with one macOS notification, so a job that has silently stopped being useful gets noticed.
3. Otherwise it builds a Storybook in its own copy, runs `paper:sync` (changed pieces only) and then `paper:check`.
4. If the record changed, it pushes it to the branch `auto/paper-sync` and opens, or updates, **one** pull request titled "chore(paper): daily sync".

**When something goes wrong it tells you.** A run that breaks (a step crashes, the Paper file cannot be found, the wrong GitHub account is active) pushes nothing and sends one macOS notification with the first line of the error and where the log is. A regression (Paper now differs from Storybook more than was accepted) sends a notification naming the pieces; if the record changed too, it is also in the pull request.

**Until the pull request is merged**, each day's run starts from that branch's record rather than `main`'s, so it only re-draws what changed since, and leaves the pull request alone when nothing did. The branch is rewritten on every run: do not commit to it by hand. If the job finds a commit there that it did not make, it stops and says so rather than discard it.

**It only runs when the Mac is on, you are logged in and Paper is open** at the scheduled time (09:30 by default).

**What the pull request means.** It says which pieces were re-drawn and why (their code changed), lists any piece that could not be drawn, and includes the check's summary. It only ever changes files under `paper/`, which is bookkeeping: nothing in it ships to apps. Merging it records what Paper now holds. If it reports a *regression*, merging does not accept it: look at the piece in Paper, fix the cause in code, or accept the new look with `npm run paper:check -- --accept --only <name>`. The job never merges anything and never pushes to `main`.

**Turning it on, off, and running it by hand**

```bash
npm run paper:schedule -- install          # shows exactly what it will write; add --yes to do it
npm run paper:schedule -- install --at 08:00 --yes
npm run paper:schedule -- status
npm run paper:schedule -- uninstall --yes
npm run paper:daily -- --dry-run           # plan only: prints what a real run would re-draw and push
npm run paper:daily -- --no-push           # the whole run for real, stopping before the commit
npm run paper:daily                        # one real run, now
```

`--dry-run` writes nothing to Paper and pushes nothing, but it is not read-only: it clones or resets the job's own copy of the repository, may install packages there, and opens the Quill file as a tab in Paper.

Logs: `~/Library/Logs/quill-paper-sync/`, one file per run, the last 14 kept.

`install` records where `node`, `npm`, `gh` and `git` live, because the scheduler starts jobs without your terminal's settings and would not find them otherwise. If you change how Node is installed, run `install` again. The job uses your existing `gh` login; it stores no passwords or tokens.

### What this job can and cannot do to your Mac and your accounts

- **Where it works.** Only in its own folder, `~/Library/Application Support/quill-paper-sync/`, and its log folder. Before it resets anything it proves the folder is the copy it made itself; it refuses to run on any other folder, including the one you work in. It also reads, then deletes, its own export files in Downloads (see above).
- **What it runs.** Whatever is on `main`, unattended: it installs the project's packages (which can run their install scripts) and runs the project's scripts. Anything merged to `main` will run on this Mac the next morning. That is the same trust you give `main` when you pull and run it yourself, without you watching.
- **What it can do in Paper.** Redraw the generated pages of the one file named "Quill Design System", and its tokens. It checks on every call that Paper answered for that file. It does not open, change or delete any other Paper file.
- **What it can do on GitHub.** Push one branch, `auto/paper-sync`, and open or update one pull request. It never merges, never pushes to `main`, and commits only files under `paper/`.
- **Whose identity it uses.** Your existing `gh` login on this Mac; it stores no password or token. Commits carry the craftwell-ai no-reply address, not your email. If the wrong GitHub account is active it stops and tells you which one is; it does not switch accounts.
- **When it runs.** Only when the Mac is awake, you are logged in, and Paper is open, at the scheduled time. It gives up after 45 minutes.
- **How to turn it off.** `npm run paper:schedule -- uninstall --yes`. To remove every trace, also delete the two folders above.

## What Paper cannot do yet, and what that means

| Paper has no… | What that means today | When Paper ships it |
|---|---|---|
| **Linked components** (a main component with instances and variants) | Every button on every page is a separate copy. Editing one changes nothing else. You can copy a Quill piece into a design, but it will not update when Quill does: it has to be copied again. | Draw each piece once as a component and place instances; give variants their own properties instead of separate sections. |
| **Shared libraries** | The tokens and frames live in this one file. Another Paper file cannot subscribe to them. | Publish this file as the library; stop pushing tokens file by file. |
| **Themes** (one token, several values) | The file is Dawn, with the moss accent. Dusk, the two Classic themes, Intelligent and the other accents are not there. | Push all five themes as modes of the same tokens and drop the Dawn-only rule. |
| **Remote access** | Scripts can only reach Paper on a Mac with the app open. GitHub cannot check or repair it, so there is a daily job on this Mac instead of a bot in the cloud. | Move the sync and the check into a GitHub workflow, like the other bots. |
| **A way back to code** | Paper can show that someone changed a frame, but a frame has no identity that says "this is Quill's Button", and the layers inside are re-made on every sync. Edits made in Paper cannot be pulled into code. | Decide then whether value edits made in Paper should flow back into code. |
| **Token types for shadow, motion, and font-axis settings** | Shadows and the Fraunces settings are written on each layer as plain values, not tokens. Change a shadow token and Paper only follows after a sync. | Push them as tokens and bind them. |
| **Some CSS** | `background-clip` (see the button ring below), `scale` and `skew`, masks and clip-paths have no equivalent and are dropped; each loss is listed per piece in the record. Hover and focus behaviour does not exist in a still frame. | Nothing to switch on: re-run the sync and the losses disappear from the record. |

Also worth knowing: a script cannot delete or reorder a page. When a piece is removed from Quill, the sync deletes that piece's artboard (only the one it recorded, and only if it still has the name the sync gave it) and renames the freed page `(unused 1)`. You can delete such a page by hand; if you do not, the sync reuses it for the next new piece.

## Known differences from the browser

These are in every comparison and are why pictures are never 0% different. None is a missing or misplaced element.

- **Buttons read 1px larger all round.** Quill's buttons keep their fill inside a transparent 1px border; Paper has no way to say that, so the fill runs under the border. A default button measures 32px of fill in Paper and 30px in the app. The layer's own size is still right.
- **Text boxes are whole pixels.** Quill's small text is 13.6px on a 19.43px line; Paper rounds each line box up. Tall text blocks come out 1 to 3px taller, and wide rows a pixel or two wider.
- **Small text looks slightly lighter**, most on light-on-dark labels. The weight in Paper is right; the two programs draw small type differently.
- **Open panels are drawn beside their trigger**, not floating over the page with a dimmed background.
- **Charts are one vector layer each.** They look right but are not editable as charts.
- **Rich text is split.** A sentence with a bold figure in it becomes separate one-style text layers on a line; it will not re-wrap as a sentence.

## The record: `paper/sync-state.json`

Written by `paper:sync`, in a fixed key order so a change shows up as a small diff. Do not edit it by hand.

```jsonc
{
  "file":        { "id", "name", "url" },                       // the Paper file
  "tokens":      { "count", "byType", "payloadHash", "sourceHash", "theme", "notRepresentable", "syncedAt" },
  "foundations": { "page", "pageId", "artboardId", "sections", "htmlHash", "syncedAt" },
  "pages":       { "<page name>": "<Paper page id>" },
  "ownedPages":  ["<Paper page id>", "…"],                      // every page the sync created: the only pages it will rename or draw on
  "removed":     [{ "slug", "page", "artboard", "at" }],        // pieces taken out, and what happened to their drawing
  "pieces": [{
    "slug": "usage-meter", "name": "Usage Meter", "kind": "component",   // component | block | template
    "status": "synced",          // synced | pending (not drawn yet) | declined (see reason) | error (see error)
    "reason": "…",               // declined only
    "error": "…",                // error only: what failed in the last sync
    "page": "❖ Usage Meter", "pageId": "p-…", "artboardId": "…",
    "sources": ["registry/lib/usage-meter.tsx", "src/stories/usage-meter.stories.tsx", "src/usage/usage-meter.usage.mjs"],
    "sourceHash": "…",           // hash of those files, comments and whitespace ignored: differs from the code → stale
    "syncedAt": "2026-10-07",
    "counts": { "stories", "nodes", "approximated", "bound", "bindable", "bindingRate" },
    "notes": ["…"],              // an overlay that could not be opened, a wider artboard, stories trimmed by the cap
    "lost": ["…"],               // CSS Paper could not hold, per kind, with a count
    "stories": [{
      "id": "components-usagemeter--card", "title": "Card",
      "opened": "none",          // none | story (it renders open) | click | hover | context | closed | crashed
      "nodes", "approximated", "bound", "bindable",
      "parts": [{ "part": "main", "nodeId": "…", "size": [380, 271.2], "htmlHash": "…" }]   // then panel-1 … for an open overlay
    }]
  }]
}
```

- **approximated**: layers placed by measuring rather than by a layout rule (a table row, a multi-column grid, overlapping avatars). They look right and do not reflow.
- **bindingRate**: of all the colours, sizes, radii and type values that could be a token, the share that is. What is left is genuinely off-scale in the code (`py-[5px]`) or a one-off mix.

## Where the code is

Everything is under `scripts/paper/`; each file starts with a comment saying what it is for.

| File | Role |
|---|---|
| `client.mjs` | talks to the Paper desktop app |
| `tokens.mjs`, `sync-tokens.mjs` | Quill's tokens as Paper tokens, and pushing them |
| `convert.mjs` | turns a rendered story into the HTML Paper accepts |
| `pieces.mjs`, `pieces.config.mjs` | the list of pieces, the story rule, and its exceptions |
| `page.mjs`, `sync-foundations.mjs` | the page layout and the Foundations page |
| `sync.mjs`, `check.mjs`, `status.mjs` | the three commands |
| `daily.mjs`, `schedule.mjs`, `schedule/` | the daily job and its schedule |
