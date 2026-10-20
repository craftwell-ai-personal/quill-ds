import * as React from 'react'
import { cn } from '@/lib/utils'

// Two four-point stars, each its own path so the gradient spans each star (a
// shared gradient left the small star one flat colour). Approved 2026-10-02.
const BIG = 'M10 4.5Q11.6 12.4 19.5 14Q11.6 15.6 10 23.5Q8.4 15.6 0.5 14Q8.4 12.4 10 4.5Z'
const SMALL = 'M18.4 0.8Q19.25 4.95 23.4 5.8Q19.25 6.65 18.4 10.8Q17.55 6.65 13.4 5.8Q17.55 4.95 18.4 0.8Z'
// At 16px and under two stars blur together, so draw one.
const SOLO = 'M12 1Q13.9 10.1 23 12Q13.9 13.9 12 23Q10.1 13.9 1 12Q10.1 10.1 12 1Z'

// The icon scale's steps, in px, so the mark can pick its drawing from a step name. Written as
// whole class names so Tailwind finds them. w-/h- rather than size-: a part that sizes its icons
// (a Button, a Badge) skips an svg whose class says size-, and the mark should follow the part.
const STEPS = {
  'icon-3xs': [8, 'w-icon-3xs h-icon-3xs'],
  'icon-2xs': [10, 'w-icon-2xs h-icon-2xs'],
  'icon-xs': [12, 'w-icon-xs h-icon-xs'],
  'icon-sm': [14, 'w-icon-sm h-icon-sm'],
  'icon-md': [16, 'w-icon-md h-icon-md'],
  'icon-lg': [18, 'w-icon-lg h-icon-lg'],
  'icon-xl': [20, 'w-icon-xl h-icon-xl'],
  'icon-2xl': [24, 'w-icon-2xl h-icon-2xl'],
  'icon-3xl': [28, 'w-icon-3xl h-icon-3xl'],
} as const
export type AiMarkSize = keyof typeof STEPS

// Sized by a step of the icon scale (`size="icon-md"`); a number still works but is off the scale.
/** Quill's AI sparkle — the one icon that means AI, drawn in the AI gradient with a one-star cut for 16px and under. */
export function AiMark({ size = 'icon-lg', label, className }: { size?: AiMarkSize | number; label?: string; className?: string }) {
  // useId keeps gradient ids unique per instance; a shared id renders every
  // later mark black once the first leaves the page.
  const id = React.useId().replace(/:/g, '')
  const [px, stepClass] = typeof size === 'number' ? [size, ''] : STEPS[size]
  const paths = px <= 16 ? [SOLO] : [BIG, SMALL]
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      className={cn('inline-block shrink-0', stepClass, className)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <defs>
        {paths.map((_, i) => (
          // Stops pulled in to 0.28 / 0.72 so gold and indigo reach the star bodies, not only the tips.
          <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.28" stopColor="var(--ai-from)" />
            <stop offset="0.5" stopColor="var(--ai-via)" />
            <stop offset="0.72" stopColor="var(--ai-to)" />
          </linearGradient>
        ))}
      </defs>
      {paths.map((d, i) => <path key={i} d={d} fill={`url(#${id}-${i})`} />)}
    </svg>
  )
}
