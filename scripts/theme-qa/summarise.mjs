// Turn the per-theme vitest JSON reports into a readable list: which story
// failed, on which element, at what contrast. Usage:
//   node scripts/theme-qa/summarise.mjs [theme ...]   (default: the four non-default themes)
// Reads .theme-qa/<theme>.json, written by `npm run test-storybook:theme`.
import fs from 'node:fs'
import path from 'node:path'

const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')
const reportDir = path.join(repo, '.theme-qa')
const themes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['dark', 'classic-light', 'classic-dark', 'intelligent']

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '')

for (const theme of themes) {
  const file = path.join(reportDir, `${theme}.json`)
  if (!fs.existsSync(file)) {
    console.log(`\n## ${theme}: no report at ${path.relative(repo, file)}`)
    continue
  }
  const report = JSON.parse(fs.readFileSync(file, 'utf8'))
  console.log(`\n## ${theme}: ${report.numFailedTests} failed / ${report.numTotalTests} stories`)
  for (const suite of report.testResults) {
    for (const t of suite.assertionResults) {
      if (t.status !== 'failed') continue
      const msg = stripAnsi((t.failureMessages || []).join('\n'))
      const element = msg.match(/<[a-z][^\n]{0,140}/)?.[0] ?? ''
      // axe's colour-contrast line carries the measured pair.
      const c = msg.match(/contrast of ([\d.]+) \(foreground color: (#\w+), background color: (#\w+)/)
      const firstLine = msg.split('\n').find((l) => l.trim() && !/^\s*at /.test(l)) ?? ''
      console.log(`- ${t.fullName}  (${path.basename(suite.name)})`)
      console.log(`    ${c ? `${c[1]}:1  ${c[2]} on ${c[3]}` : firstLine.slice(0, 160)}`)
      if (element) console.log(`    ${element}`)
    }
  }
}
