'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { AiMark } from '@/components/ui/ai-mark'
import { cn } from '@/lib/utils'

export type AgentStepStatus = 'done' | 'running' | 'waiting' | 'failed'

export type AgentStep = {
  /** What the step is, in a few words: "Read signups-sept.csv". */
  label: string
  status: AgentStepStatus
  /** What happened in the step. A step with detail opens to show it; one without is a plain row. */
  detail?: React.ReactNode
  /** A short note at the end of the row, such as how long it took ("4 s"). A running step says "running" on its own. */
  meta?: string
  /** Start with the detail open. */
  defaultOpen?: boolean
}

const STATUSES: AgentStepStatus[] = ['done', 'running', 'waiting', 'failed']
const STATE_LABEL: Record<AgentStepStatus, string> = { done: 'Done', running: 'Running', waiting: 'Waiting', failed: 'Failed' }
// Done goes muted (never struck through); the running step is the one at full strength.
const TONE: Record<AgentStepStatus, string> = {
  done: 'text-muted-foreground',
  running: 'font-semibold text-foreground',
  waiting: 'text-ink-soft',
  failed: 'text-ink-soft',
}
// items-start, with the dot in a box one line tall, keeps the dot on the first line of a label that wraps.
const ROW = 'flex min-w-0 flex-1 items-start gap-2.5 rounded-md px-1 py-1.5 text-left'

// A status this version does not know (a newer agent, a typo) reads as waiting rather than drawing nothing.
const statusOf = (step: AgentStep): AgentStepStatus => (STATUSES.includes(step.status) ? step.status : 'waiting')
const hasDetail = (step: AgentStep) => step.detail !== undefined && step.detail !== null && step.detail !== false && step.detail !== ''

// Progress is moss and terracotta, never the AI gradient. The deep cuts clear 3:1 on the card in every theme.
function StepDot({ status }: { status: AgentStepStatus }) {
  if (status === 'running') return <Icon name="progress_activity" className="size-icon-md animate-spin text-moss-deep motion-reduce:animate-none" />
  if (status === 'done') return <span className="grid size-4 place-items-center rounded-full bg-moss-deep text-paper"><Icon name="check" className="size-icon-xs" /></span>
  if (status === 'failed') return <span className="grid size-4 place-items-center rounded-full bg-terracotta-deep text-paper"><Icon name="close" className="size-icon-xs" /></span>
  return <span className="size-4 rounded-full border-2 border-input" />
}

/** Shows the steps an AI agent is working through — done, running, waiting or failed — with a count in the header and rows that open to show what happened. */
export function AgentSteps({ title, steps, onRetry, className }: {
  title: string
  steps: AgentStep[]
  /** Shows Retry on failed steps; called with the step's position in the list. */
  onRetry?: (index: number) => void
  className?: string
}) {
  const baseId = React.useId()
  // Open rows are tracked by position: labels may repeat, positions cannot.
  const [open, setOpen] = React.useState<Set<number>>(
    () => new Set(steps.flatMap((step, index) => (step.defaultOpen && hasDetail(step) ? [index] : []))),
  )
  // The status region is on the page from the first paint but stays empty until just after mount: a live region
  // that arrives already filled is announced unreliably, one whose text changes is.
  const [announcing, setAnnouncing] = React.useState(false)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncing(true), 100)
    return () => window.clearTimeout(timer)
  }, [])

  const statuses = steps.map(statusOf)
  const doneCount = statuses.filter((status) => status === 'done').length
  const runningIndex = statuses.indexOf('running')
  const failedIndex = statuses.indexOf('failed')
  const active = runningIndex !== -1 || failedIndex !== -1
  // A list that was never active while on the page (restored from history, already finished) must not announce itself.
  const [wasActive, setWasActive] = React.useState(active)
  if (active && !wasActive) setWasActive(true)

  if (!steps.length) return null

  const count = `${doneCount} of ${steps.length} done`
  const spoken = !announcing || !(active || wasActive) ? ''
    : failedIndex !== -1 ? `Failed: ${steps[failedIndex].label}. ${count}`
    : runningIndex !== -1 ? `Running: ${steps[runningIndex].label}. ${count}`
    : count
  const toggle = (index: number) => setOpen((current) => {
    const next = new Set(current)
    if (!next.delete(index)) next.add(index)
    return next
  })

  return (
    <div data-slot="agent-steps" role="group" aria-labelledby={`${baseId}-title`}
      className={cn('grid gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}>
      {/* px-1 matches the rows' inset, so the mark lines up with the dots and the count with the times. */}
      <div className="flex items-center gap-2 px-1">
        <AiMark size="icon-md" />
        <p id={`${baseId}-title`} className="min-w-0 flex-1 font-semibold text-ink-soft">{title}</p>
        {/* Hidden from screen readers only while the status region below is saying the same count. */}
        <p data-slot="step-count" aria-hidden={spoken ? true : undefined} className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{count}</p>
      </div>
      {/* sr-only makes the region a real box that takes no space; it carries the one copy a screen reader hears. */}
      <div role="status" className="sr-only">{spoken}</div>
      <ol className="grid gap-0.5">
        {steps.map((step, index) => {
          const status = statuses[index]
          const expandable = hasDetail(step)
          const isOpen = expandable && open.has(index)
          const detailId = `${baseId}-detail-${index}`
          const meta = step.meta ?? (status === 'running' ? 'running' : undefined)
          const row = (
            <>
              <span data-slot="step-dot" data-status={status} className="flex h-[1lh] shrink-0 items-center"><StepDot status={status} /></span>
              <span className="min-w-0 flex-1">
                <span className="sr-only">{STATE_LABEL[status]}: </span>
                <span data-slot="step-text">{step.label}</span>
                {expandable ? <Icon name="chevron_right" className={cn('size-icon-sm', 'ml-1 align-[-0.15em] text-muted-foreground transition-transform motion-reduce:transition-none', isOpen && 'rotate-90')} /> : null}
              </span>
              {meta ? (
                // The outer box is one row-line tall so the smaller note still sits on the label's first line.
                // The automatic "running" is hidden from screen readers: the row already starts with "Running:".
                <span aria-hidden={step.meta === undefined ? true : undefined} className="flex h-[1lh] shrink-0 items-center">
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{meta}</span>
                </span>
              ) : null}
            </>
          )
          return (
            <li key={index}>
              <div className="flex items-start gap-1">
                {expandable ? (
                  <button type="button" aria-expanded={isOpen} aria-controls={detailId} onClick={() => toggle(index)}
                    className={cn(ROW, TONE[status], 'hover:bg-muted outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50')}>
                    {row}
                  </button>
                ) : (
                  <div className={cn(ROW, TONE[status])}>{row}</div>
                )}
                {status === 'failed' && onRetry ? (
                  <Button type="button" variant="ghost" size="xs" className="mt-1 shrink-0 text-destructive" aria-label={`Retry: ${step.label}`} onClick={() => onRetry(index)}>Retry</Button>
                ) : null}
              </div>
              {expandable ? (
                <div id={detailId} hidden={!isOpen} className="mt-0.5 mb-1.5 ml-8 border-l-2 border-border pl-2.5 text-xs text-muted-foreground">{step.detail}</div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
