import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { ALL_USAGE } from '../src/usage/index.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// The Storybook MCP manifest (public/storybook/manifests/components.json)
// takes each component's description from react-docgen, which reads the JSDoc
// directly above the component's definition — not from the story's docs
// parameters. So every documented component carries its usage summary as a
// one-line JSDoc, and this guard keeps that line equal to the summary: a
// summary edited in src/usage without the JSDoc would publish two different
// descriptions of one component (CRA-212).
export function sourceFilesFor(u) {
  const candidates = u.kind === 'pattern'
    ? [`registry/blocks/${u.name}.tsx`, `registry/examples/${u.name}.tsx`]
    : [`src/components/ui/${u.name}.tsx`, `registry/lib/${u.name}.tsx`]
  return candidates.filter((f) => existsSync(join(root, f)))
}

test('every documented component carries its usage summary as the JSDoc on its definition', () => {
  const offenders = []
  for (const u of ALL_USAGE) {
    const files = sourceFilesFor(u)
    if (!files.length) {
      offenders.push(`${u.name}: no source file under registry/blocks, registry/lib or src/components/ui`)
      continue
    }
    const line = `/** ${u.summary.replace(/\*\//g, '* /')} */`
    const ok = files.some((f) => {
      const lines = readFileSync(join(root, f), 'utf8').split('\n')
      const at = lines.indexOf(line)
      return at !== -1 && /^(export )?(default )?(function|const) [A-Za-z]/.test(lines[at + 1] ?? '')
    })
    if (!ok) offenders.push(`${u.name}: expected \`${line.slice(0, 60)}…\` directly above the component in ${files.join(' or ')}`)
  }
  assert.deepEqual(offenders, [])
})
