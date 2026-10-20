'use client'

import * as React from 'react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

/** "8 s", "1 min 38 s", "2 min" — how long the AI thought, as the finished row says it. Under a second, negative, NaN or Infinity all read "1 s", the shortest it says; AiThinking itself shows "Thought it through" instead of a duration it cannot trust. */
export function formatThoughtFor(seconds: number) {
  const s = Number.isFinite(seconds) ? Math.max(1, Math.round(seconds)) : 1
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r ? `${m} min ${r} s` : `${m} min`
}

export type AiThinkingProps = {
  status: 'working' | 'done'
  /** The working label. */
  label?: string
  /** What the AI is doing right now, shown under the label while working. */
  activity?: string
  /** How long it thought; shown once done. */
  seconds?: number
  /** The reasoning, opened from the finished row. */
  steps?: React.ReactNode[]
  defaultOpen?: boolean
  className?: string
}

/** Shows an AI working before its answer — a shimmering "Thinking" with what it is doing — then folds into one quiet "Thought for 8 s" row that opens the reasoning. */
export function AiThinking({ status, label = 'Thinking', activity, seconds, steps, defaultOpen = false, className }: AiThinkingProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const listId = React.useId()
  // The status region is on the page from the first paint but stays empty until just after mount: a live region
  // that arrives already filled is announced unreliably, one whose text changes is. The timer (not a direct
  // setState in the effect) is what lets the first paint go out empty.
  const [announcing, setAnnouncing] = React.useState(false)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncing(true), 100)
    return () => window.clearTimeout(timer)
  }, [])

  const working = status === 'working'
  // A duration that is missing, not a number or negative would read as nonsense, so it is treated as unknown.
  const unknownSeconds = seconds === undefined || !Number.isFinite(seconds) || seconds < 0
  const summary = unknownSeconds ? 'Thought it through' : `Thought for ${formatThoughtFor(seconds)}`
  const hasSteps = Boolean(steps?.length)
  return (
    <div data-slot="ai-thinking" data-status={status} className={cn(working ? 'grid gap-0.5' : 'grid gap-1', className)}>
      {/* One live region stays mounted across both states, so the working text changes into nothing instead of a
          fresh region arriving already filled. It is empty once done: the finished row says the rest, and a done
          reply restored from history must not announce itself. sr-only makes it a real box that takes no space,
          and carries the only copy a screen reader hears; the visible label below is hidden from it. */}
      <div role="status" className="sr-only">
        {working && announcing ? [label, activity].filter(Boolean).join('. ') : ''}
      </div>
      {working ? (
        <>
          <span aria-hidden className="ai-shimmer w-fit text-sm font-semibold">{label}</span>
          {activity ? <span aria-hidden className="text-xs text-muted-foreground">{activity}</span> : null}
          <span aria-hidden className="ai-line mt-1.5" />
        </>
      ) : null}
      {working ? null : hasSteps ? (
        <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}
          // px-1 gives the focus ring room around the chevron and the last letter; -mx-1 keeps the chevron in line with the steps below.
          className="-mx-1 inline-flex w-fit items-center gap-1 rounded-sm px-1 text-sm text-muted-foreground hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
          <Icon name="chevron_right" className={cn('size-icon-sm', 'transition-transform motion-reduce:transition-none', open && 'rotate-90')} />
          {summary}
        </button>
      ) : (
        <span className="text-sm text-muted-foreground">{summary}</span>
      )}
      {!working && hasSteps ? (
        <ol id={listId} hidden={!open} className="ml-1.5 grid gap-1 border-l-2 border-border pl-3.5 text-xs text-muted-foreground">
          {steps!.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      ) : null}
    </div>
  )
}
