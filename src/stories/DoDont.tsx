import type { ReactNode } from 'react'
import type { Decorator } from '@storybook/nextjs-vite'
import type { Usage } from '@/usage/types'

// The widest a pair grows on a very wide canvas (75rem at the 16px root), so the two examples stay readable side by side.
export const DO_DONT_MAX_WIDTH_PX = 1200

/** The one story-id rule the width helpers and the framing guard share: Storybook ids end `--do-dont` (or `--<name>-do-dont`). */
export const isDoDontStory = ({ id }: { id: string }) => /do-?dont/.test(id.split('--').pop() ?? '')

/**
 * Wrap a story in a width-constraining decorator for every story EXCEPT the Do/Don't pair. A meta-level decorator
 * cannot be removed by one story, and a column sized for one component squeezes a two-up pair to half of it (26 files
 * did, down to 120px a side). Any meta decorator that fixes a width goes through this, or through inColumn().
 * .storybook/do-dont-guard.ts fails the test run for a pair that ends up squeezed anyway.
 */
export const unlessDoDont = (decorator: Decorator): Decorator =>
  function UnlessDoDont(Story, context) {
    return isDoDontStory(context) ? <Story /> : decorator(Story, context)
  }

/** A column of one fixed width for the component's own stories, e.g. inColumn('w-80'). The Do/Don't pair gets the whole canvas. */
export const inColumn = (className: string): Decorator =>
  unlessDoDont((Story) => (
    <div className={className}>
      <Story />
    </div>
  ))

// Usage rules mark code with backticks (they are markdown in llms.txt); show those spans as code, not as literal `marks`.
function withCode(text: string) {
  return text.split('`').map((part, index) => (index % 2 ? <code key={index} className="font-mono text-[0.92em]">{part}</code> : part))
}

// The coloured cap on each frame. A thick top border on a rounded box tapers into the thin side borders at the
// corners (a crescent); a strip clipped to the frame's outline follows the curve instead.
function TopRule({ className }: { className: string }) {
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-px overflow-hidden rounded-xl">
      <span className={`block h-1 ${className}`} />
    </span>
  )
}

/**
 * Side-by-side Do/Don't frame for docs pages. The caption text comes from the
 * usage file by rule id, so the rendered example can never drift from the
 * written rule — scripts/usage-coverage.test.mjs enforces the pairing.
 * Docs-only chrome: Do is framed with --primary (ink), Don't with --destructive.
 */
export function DoDontPair({
  usage,
  id,
  doExample,
  dontExample,
  exampleClassName,
}: {
  usage: Usage
  id: string
  doExample: ReactNode
  dontExample: ReactNode
  /** Width of each example inside its figure, e.g. the 'w-64' the component's own stories use. Without it an example that is `w-full` stretches to the figure. */
  exampleClassName?: string
}) {
  const rule = usage.rules.find((r) => r.id === id)
  if (!rule) throw new Error(`No rule '${id}' in usage for '${usage.name}'`)
  return (
    <div data-quill-dodont className="mx-auto grid w-full max-w-[75rem] gap-4 sm:grid-cols-2">
      <figure className="relative flex min-w-0 flex-col gap-3 rounded-xl border p-4 pt-5">
        <TopRule className="bg-primary" />
        <div className={`min-w-0 max-w-full ${exampleClassName ?? ''}`.trim()}>{doExample}</div>
        <figcaption className="text-sm">
          <strong>Do.</strong> {withCode(rule.do)}
        </figcaption>
      </figure>
      <figure className="relative flex min-w-0 flex-col gap-3 rounded-xl border p-4 pt-5">
        <TopRule className="bg-destructive" />
        <div className={`min-w-0 max-w-full ${exampleClassName ?? ''}`.trim()}>{dontExample}</div>
        <figcaption className="text-sm">
          <strong>Don&apos;t.</strong> {withCode(rule.dont)}
        </figcaption>
      </figure>
    </div>
  )
}
