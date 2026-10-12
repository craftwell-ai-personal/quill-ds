// Picture comparison for `npm run paper:check`: the story a piece stands for, and a
// pixel diff with a tolerance for font rasterisation. A REGRESSION is more difference
// than the accepted baseline by REGRESSION_PCT points, or a size drift over REGRESSION_PX.

import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const PAPER = [0xf5, 0xed, 0xdd] // Dawn page ground: what surrounds a piece in both renders
export const REGRESSION_PCT = 1.0 // points of diffPct above the accepted value
export const REGRESSION_PX = 8 // CSS px of width or height drift
const SCALE = 2

/**
 * The story that stands for a block: `…--<name>`, else `…--default`, else the first non-docs, non-Do/Don't story.
 * A block can be imported by another block's stories (the chat page shows conversation-history as its sidebar), so
 * stories from the block's own file, whose title ends in its name, are looked at first.
 */
export function canonicalStory(name, storyIds) {
  const shown = storyIds.filter((id) => !/--docs$/.test(id) && !/--do-?dont$/.test(id))
  const own = shown.filter((id) => id.split('--')[0].endsWith(name))
  const real = own.length ? own : shown
  return real.find((id) => id.endsWith(`--${name}`)) ?? real.find((id) => id.endsWith('--default')) ?? real[0] ?? null
}

/** A render with no fill is transparent; Storybook renders on paper. Same ground for both. */
export function flatten(png) {
  for (let i = 0; i < png.width * png.height; i++) {
    const a = png.data[i * 4 + 3] / 255
    if (a === 1) continue
    for (let c = 0; c < 3; c++) png.data[i * 4 + c] = Math.round(png.data[i * 4 + c] * a + PAPER[c] * (1 - a))
    png.data[i * 4 + 3] = 255
  }
  return png
}

export function padTo(png, w, h) {
  if (png.width === w && png.height === h) return png
  const out = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) { out.data[i * 4] = PAPER[0]; out.data[i * 4 + 1] = PAPER[1]; out.data[i * 4 + 2] = PAPER[2]; out.data[i * 4 + 3] = 255 }
  PNG.bitblt(png, out, 0, 0, Math.min(png.width, w), Math.min(png.height, h), 0, 0)
  return out
}

/** Pixel-level comparison on the union canvas. diffPct is differing pixels over the union. */
export function comparePngs(a, b) {
  const w = Math.max(a.width, b.width)
  const h = Math.max(a.height, b.height)
  const pa = padTo(a, w, h)
  const pb = padTo(b, w, h)
  const diff = new PNG({ width: w, height: h })
  // includeAA:false — anti-aliased pixels are detected and skipped; two renderers
  // rasterise the same glyph differently and that is not drift.
  const differing = pixelmatch(pa.data, pb.data, diff.data, w, h, { threshold: 0.2, includeAA: false, diffColor: [196, 104, 75], diffColorAlt: [122, 140, 92] })
  return {
    diffPct: Math.round((differing / (w * h)) * 10000) / 100,
    differing,
    diff,
    size: { a: [a.width / SCALE, a.height / SCALE], b: [b.width / SCALE, b.height / SCALE] },
    sizeDelta: [Math.abs(a.width - b.width) / SCALE, Math.abs(a.height - b.height) / SCALE],
  }
}

/** Three images side by side on paper, for a human to read. */
export function strip(a, b, diff, gap = 16 * SCALE) {
  const h = Math.max(a.height, b.height, diff.height)
  const w = a.width + b.width + diff.width + gap * 2
  const out = padTo(new PNG({ width: 1, height: 1 }), w, h)
  let x = 0
  for (const img of [a, b, diff]) { PNG.bitblt(img, out, 0, 0, img.width, img.height, x, 0); x += img.width + gap }
  return out
}
