/**
 * Quill drift audit — the "watch" step of the self-healing loop, kept
 * deliberately narrow and deterministic (no AI judgment, so no noise).
 *
 * Reports the time-based drift that per-PR CI can't catch: dependency freshness,
 * security advisories, and release housekeeping. Read-only — it never edits
 * anything. Run locally with `npm run drift-audit`, or weekly via the
 * drift-audit GitHub Actions workflow.
 *
 * Exit code: 0 normally; 1 only when a non-breaking `npm audit fix` would
 * actually reduce the HIGH/CRITICAL count — measured by simulating the fix, not
 * by trusting npm's per-advisory `fixAvailable` flag (see the Security section
 * for why that flag lies, and flaps). So a scheduled run turns red (and
 * notifies) on security drift we can genuinely act on, but stays quiet for
 * routine outdatedness and for advisories whose only "fix" is a breaking major
 * we've deliberately held (weekly false alarms are exactly the noise this
 * design avoids). The invariant checks that CAN be deterministic (intent tags,
 * accent copy, generated-file sync, changelog, registry file paths) live in the
 * test suite and run on every PR instead.
 *
 * The Paper mirror is intentionally NOT here: Paper is reachable only from a
 * Mac with the app open. See scripts/DRIFT-AUDIT.md, Tier 3.
 */
import { execSync } from 'node:child_process'
import { readFileSync, mkdtempSync, copyFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

// npm outdated / audit exit non-zero by design; capture output regardless.
// Returns null when the output isn't JSON at all, so callers can tell "nothing
// found" apart from "couldn't measure" — conflating those is how this script
// previously talked itself into a false alarm.
function jsonCmd(cmd, cwd = root) {
  const parse = (s) => {
    try {
      return JSON.parse(s || '')
    } catch {
      return null
    }
  }
  try {
    return parse(execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
  } catch (e) {
    return parse(e.stdout?.toString())
  }
}

const out = []
const p = (s = '') => out.push(s)

p('# Quill drift audit')
p()
p(`Version \`${pkg.version}\`.`)
p()

// --- Dependencies ---
const outdated = jsonCmd('npm outdated --json')
const names = Object.keys(outdated)
p('## Dependencies')
p()
if (names.length === 0) {
  p('All dependencies current.')
} else {
  const major = names.filter((n) => outdated[n].current?.split('.')[0] !== outdated[n].latest?.split('.')[0])
  p(`${names.length} package(s) behind latest (${major.length} major):`)
  p()
  for (const n of names) {
    const o = outdated[n]
    const isMajor = o.current?.split('.')[0] !== o.latest?.split('.')[0]
    p(`- \`${n}\` ${o.current} → ${o.latest}${isMajor ? ' **(major)**' : ''}`)
  }
}
p()

// --- Security ---
const audit = jsonCmd('npm audit --json')
const vulns = audit.metadata?.vulnerabilities ?? {}
const total = vulns.total ?? 0

// Actionability is measured, not asked for. The obvious implementation — trust
// each advisory's own `fixAvailable` — is wrong twice over, and shipped a false
// alarm the first Monday it ran:
//
//   * It is not deterministic. When several advisories share one root cause
//     (a `minimatch` ReDoS reaching us through `eslint-config-next`), npm marks
//     an arbitrary one of them `fixAvailable: true` and the rest major-only.
//     Three consecutive runs on an unchanged lockfile blamed `eslint-plugin-react`,
//     then `eslint-plugin-import`, then `eslint-plugin-react` again.
//   * `fixAvailable: true` does not mean fixable. For that same advisory, a real
//     `npm audit fix` churns 22 packages and clears *nothing* — the only true fix
//     is the eslint-config-next major we hold deliberately.
//
// So ask the question we actually care about: does a non-breaking `npm audit fix`
// reduce the high/critical count? Simulate it and compare. Deterministic, immune
// to which package npm decides to blame, and it cannot claim a fix that isn't one.
const highCritical = (v) => (v?.high ?? 0) + (v?.critical ?? 0)
const before = highCritical(vulns)
const namesHighCritical = Object.entries(audit.vulnerabilities ?? {})
  .filter(([, adv]) => adv.severity === 'high' || adv.severity === 'critical')
  .map(([name]) => name)

// Simulate the fix against a throwaway copy of the manifest + lockfile and
// re-audit there. `--package-lock-only` resolves without installing, and the
// copy means nothing in this repo is touched. (`npm audit fix --dry-run --json`
// is not an option: despite the flag it prints a plain-text "add <pkg>" list,
// not JSON — parse it and you measure zero remaining advisories every time.)
// Returns null if the simulation can't be measured, so an infra hiccup reads as
// "unknown" rather than "everything is fixable".
function highCriticalAfterNonBreakingFix() {
  let dir
  try {
    dir = mkdtempSync(join(tmpdir(), 'quill-audit-'))
    for (const f of ['package.json', 'package-lock.json']) copyFileSync(join(root, f), join(dir, f))
    // Exits non-zero whenever advisories remain; the re-audit below is the signal.
    try {
      execSync('npm audit fix --package-lock-only', { cwd: dir, stdio: 'ignore' })
    } catch {
      /* expected */
    }
    const post = jsonCmd('npm audit --json', dir)
    return post?.metadata?.vulnerabilities ? highCritical(post.metadata.vulnerabilities) : null
  } catch {
    return null
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
}

const after = before === 0 ? 0 : highCriticalAfterNonBreakingFix()
const measurable = after !== null
const resolvable = measurable ? Math.max(0, before - after) : 0

p('## Security')
p()
if (total === 0) {
  p('No known advisories.')
} else {
  p(`${total} advisory/advisories: ` + ['critical', 'high', 'moderate', 'low', 'info'].filter((s) => vulns[s]).map((s) => `${vulns[s]} ${s}`).join(', ') + '.')
  if (resolvable > 0) {
    p(`\n**${resolvable} of ${before} high/critical clear under a non-breaking \`npm audit fix\` — this run fails.**`)
    p(`\nHigh/critical present: ${namesHighCritical.join(', ')}.`)
  } else if (before > 0 && measurable) {
    p(
      `\n${before} high/critical, none of which a non-breaking \`npm audit fix\` resolves ` +
        `(${namesHighCritical.join(', ')}) — reported, not failing; held pending upstream.`
    )
  } else if (before > 0) {
    p(
      `\n${before} high/critical (${namesHighCritical.join(', ')}). Could not simulate a fix ` +
        `to tell whether any are resolvable — not failing on an unknown.`
    )
  }
}
p()

// --- Housekeeping ---
p('## Housekeeping')
p()
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const hasChangelog = changelog.includes(`## [${pkg.version}]`)
let hasTag = null
try {
  hasTag = execSync(`git tag -l v${pkg.version}`, { cwd: root, encoding: 'utf8' }).trim() === `v${pkg.version}`
} catch {
  hasTag = null // git/tags unavailable — don't assert
}
p(`- CHANGELOG entry for v${pkg.version}: ${hasChangelog ? '✓' : '✗ missing'}`)
p(`- git tag v${pkg.version}: ${hasTag === null ? '— (tags not available)' : hasTag ? '✓' : '✗ missing'}`)
p()

const report = out.join('\n')
console.log(report)

// Mirror to the GitHub Actions step summary when present.
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    execSync(`cat >> "${process.env.GITHUB_STEP_SUMMARY}"`, { input: report + '\n', stdio: ['pipe', 'ignore', 'ignore'] })
  } catch {
    /* best-effort */
  }
}

process.exit(resolvable > 0 ? 1 : 0)
