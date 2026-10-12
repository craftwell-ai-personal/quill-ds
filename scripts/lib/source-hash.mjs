// Content hashes that say whether code has moved since Paper last drew it.
// Comments and whitespace are ignored, so a JSDoc-only change does not read as drift.
// The digests must stay byte-identical: paper/sync-state.json stores them.

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const digest = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16)
// Strip block comments, line comments (not the // inside https://), and whitespace runs.
const strip = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1').replace(/\s+/g, ' ').trim()

export const blockHash = (source) => digest(strip(source))
export const tokensHash = () => digest(strip(readFileSync(join(root, 'src/tokens/quill.tokens.mjs'), 'utf8')))
