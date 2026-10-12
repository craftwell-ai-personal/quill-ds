# Drift audit

Quill keeps itself honest with a three-tier "watch" system, and since v0.2.20 it
also **acts** on what it sees. The original rule has not been relaxed, only
automated: *fixes always go through the normal PR flow*. What changed is who
opens the PR and who merges it — a bot, once the required check is green —
rather than whether the check applies. Nothing writes to `main` directly, so an
automated fix that is wrong shows up as a red PR, not a broken `main`.

Each tier is scoped by what it needs, so the noisy/auth-gated failure modes never
occur. The automation layer is described at the end.

## Tier 1 — invariants in CI (deterministic, per-PR, zero noise)

Codified assertions that run on every PR via `npm run test:tokens` and the CI
"Generated files in sync" step. Drift literally cannot merge:

- **Intent metadata** — every registry block has `meta.intent` (from the
  controlled vocabulary) + `meta.use_when`. (`scripts/registry-meta.test.mjs`)
- **Accent copy** — the base theme description names the current default accent,
  tied to `DEFAULT_ACCENT`. (caught the real "terracotta accents" drift)
- **Generated files in sync** — `globals.css`, the DTCG export, the built
  registry (`public/r`), and `llms.txt` must match a fresh regenerate from
  source. (CI `git diff --exit-code`)
- **llms.txt freshness** — committed file equals the generator output.
  (`scripts/build-llms.test.mjs`)
- **Release + reference integrity** — the current version has a CHANGELOG entry;
  every registry item points at files that exist. (`scripts/repo-invariants.test.mjs`)

## Tier 2 — scheduled report (time-based facts, headless, low-noise)

`npm run drift-audit` (`scripts/drift-audit.mjs`) reports what changes on the
calendar rather than per-commit: dependency freshness (`npm outdated`), security
advisories (`npm audit`), and release housekeeping. Read-only.

Runs weekly via `.github/workflows/drift-audit.yml`, writing to the run's step
summary. It **fails (and emails) only on an actionable high/critical advisory** —
one with a real, non-major fix. Routine outdatedness and upstream advisories
whose only "fix" is a breaking major (which we hold deliberately) are reported
but do not fail the run, so there are no weekly false alarms.

**The act arm — `.github/dependabot.yml`.** The audit reports staleness; it does
not fix it. Dependabot opens the PR, on the same Monday 13:00 UTC window, and the
required CI check proves the bump before it can merge. It inherits this file's
no-false-alarms rule: the deliberately held majors (`@types/node`, `eslint`,
`typescript`) are *ignored* rather than retried into a red PR every week, and
lockstep families (all Storybook packages; `next` + `eslint-config-next`) are
grouped so a partial bump — which would simply be broken — cannot be proposed.
Minor and patch bumps now merge themselves once green (see Automation below);
majors are commented on and left for a human.

## Tier 3 — the Paper mirror (code → Paper, one way)

The Paper file "Quill Design System" is the design mirror of the code (Figma was retired
2026-10-11). Code is the source; Paper is redrawn from Storybook by script and never edited
by hand. Details: `paper/README.md`.

- **Coverage (Tier 1, in `test:tokens`).** `scripts/paper-coverage.test.mjs` fails when a
  component, block or template has no entry in `paper/sync-state.json` (`synced`,
  `pending`, or `declined` with a reason). The fix needs no Paper:
  `npm run paper:status -- --record-pending`, then commit the record.
- **Staleness (report, not a failure).** CI cannot reach Paper, so a piece whose code moved
  is listed by `npm run paper:status` and cleared by `npm run paper:sync` on the Mac with
  Paper open.
- **Picture check.** `npm run paper:check` compares each drawn story with Storybook against
  `paper/visual-baseline.json`; `npm run paper:daily` runs sync + check once a day on this
  Mac and opens a pull request, never merging.

## Automation — the loop that closes itself

Six workflows. All but `claude-repair` are deterministic: each has a provably
correct answer, so a green required check genuinely means "correct".
`claude-repair` is not, and is fenced accordingly.

| Workflow | Does | Merges itself? |
| --- | --- | --- |
| `dependabot-auto-merge.yml` | Enables auto-merge on Dependabot minor/patch PRs; comments on majors and leaves them | yes, once green |
| `dependabot-unstick.yml` | After every push to `main` (and 6-hourly), asks Dependabot to `recreate` any of its PRs left BEHIND or DIRTY once the regenerate step pushed to it | comments only |
| `self-heal.yml` | Rebuilds generated files; opens a PR if the committed output drifted | yes, once green |
| `release.yml` | Tags + publishes a version that has none; opens a bump PR when commits pile up untagged | yes, once green |
| `library-sync.yml` | On every published release, re-pulls the items each Quill-styled app already uses — one PR per app | yes, once **that app's** checks pass |
| `claude-repair.yml` | On a red `main`, has Claude diagnose and open a fix PR | **no** — human merges |

Two properties hold across all six:

- **Nothing writes to a default branch.** Every change arrives as a PR that the
  target repo's checks must pass — here the required `Lint · types · tests ·
  build`, in a synced app whatever that app declares. A wrong automated change
  is a red PR, not a broken `main`. (`library-sync` merges an app PR directly
  only when the app declares no checks at all — green by absence.)
- **Everything terminates.** `self-heal` re-runs after its own PR merges, finds
  no drift, and stops. `release` publishes, then finds nothing unreleased, and
  stops.

### Setup this depends on

- **`AUTOMATION_TOKEN` secret — required, or the loop stalls.** A PR opened with
  the default `GITHUB_TOKEN` does *not* start a workflow run, so CI never reports
  on it, so auto-merge waits forever. `self-heal` and `release` therefore open
  their PRs with a fine-grained PAT (Contents: read/write, Pull requests:
  read/write on this repo). Both workflows fall back to `GITHUB_TOKEN` and write
  a warning into the run summary rather than failing silently. Dependabot's own
  PRs are unaffected — Dependabot is not `GITHUB_TOKEN`, so CI runs on them
  normally and `dependabot-auto-merge.yml` needs no PAT.
- **Repo settings:** allow auto-merge, workflow permissions = read *and write*,
  Dependabot alerts + security updates on.
- **`LIBRARY_SYNC_TOKEN` secret — required by `library-sync.yml` only.** The
  sync pushes branches and merges PRs in the *app* repos, which the
  quill-ds-scoped `AUTOMATION_TOKEN` cannot reach: it needs a fine-grained PAT
  for **All repositories** with Contents: read/write and Pull requests:
  read/write. "All repositories" is deliberate — a future app is covered the
  day it is created. Missing secret → the run fails loudly at the first step.
  The `release` trigger fires only because releases are published with a PAT;
  see the comment in `library-sync.yml`.
- **`claude-repair.yml` is off** until both an `ANTHROPIC_API_KEY` secret and an
  `ENABLE_CLAUDE_AUTOFIX = true` repo variable exist.

### Why the fourth tier is fenced

The first three automate work with a right answer. Claude repair automates
judgement, and judgement fails differently: a confident wrong answer is
indistinguishable from a confident right one at a glance. The session that built
this loop produced a live example — a proposed fix to this very script parsed
`npm audit fix --dry-run --json` as JSON. It is not JSON; it is a plain-text
`add <pkg>` list. The "fix" would have failed every run, and it was caught only
because a result contradicted an earlier measurement and got re-checked. So its
PRs stay human-merged, and its prompt tells it to reproduce before fixing, verify
after, and say plainly when it is unsure.

## Tier 4 — cross-app pattern scan (scheduled, outward-looking)

Tiers 1–3 all watch Quill against itself. This one watches the apps *styled with*
Quill: `npm run pattern-scan` (`scripts/pattern-scan.mjs`), Mondays 14:00 UTC via
`.github/workflows/pattern-scan.yml`.

It reports two things nobody was noticing — a pattern hand-built in two or more
Quill-styled apps that Quill doesn't ship, and a block Quill already ships that
got rebuilt from scratch anyway (a findability problem, not a gap).

Two rules gate every candidate. **Origination:** the app must carry Quill's token
layer, which is how the app list is built in the first place, so an app without
Quill styling is never scanned and nothing from it can ever be suggested. That
also excludes the repos that merely *mention* Quill — `scaffold` carries its
script lineage but no styling, and 3 of 7 naive matches were false
positives. **Repetition:** built independently in at least two apps, or one app's
domain work qualifies (without it, one app's bespoke assets are a
candidate).

Read-only. It opens no PRs and promotes nothing, because name matching cannot
tell whether same-named components are one pattern — the three consumer apps each
have an "agent avatar" and the three are 94/137/46 lines built from entirely
different things. It reports line counts and imports side by side and leaves the
call to a human. Promotion follows the normal branch → PR → CI → merge flow, and
the decision is recorded in `scripts/pattern-scan.decided.json` so the report
moves it to "Already decided" instead of raising it again.

**It states its own limit in every report.** The rebuilt list only catches exact
name matches, so `update-feed` (Quill ships `activity-feed`) and `vitals-strip`
(`stat-cards`) are invisible to it. The list is a floor, not a total — an
incomplete list that reads as complete is worse than no list.

**Delivery is a tracking-issue comment, not a failed run.** A passing scheduled
workflow emails nobody, and failing the run every week to force an email would
train everyone to ignore red. So the report posts to the issue labelled
`pattern-scan` (created on first run, assigned so every comment notifies), and the
run turns red only when the scan itself breaks. Red here means the same thing it
means everywhere else in this file.

**Two tokens, not interchangeable.** `PATTERN_SCAN_TOKEN` is a fine-grained PAT
scoped to the org with `Contents: read` — it reads the other repos and cannot
create an issue. The workflow's own `GITHUB_TOKEN` writes the comment and cannot
read the other repos. The script keeps them as separate variables on purpose.

**The account is a user, not an organisation.** `craftwell-ai` is a personal
account, so discovery uses `/user/repos?affiliation=owner` — the *authenticated*
user's own repos. `/orgs/craftwell-ai/repos` 404s, and `/users/craftwell-ai/repos`
is worse than a 404: it answers 200 with only the public repos (just `quill-ds`),
which would have produced a confident, clean-looking scan of nothing. So
`PATTERN_SCAN_TOKEN` must be owned by the account that owns the apps, and a run
that lists zero repos fails loudly rather than reporting no findings.
