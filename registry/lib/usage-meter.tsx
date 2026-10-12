'use client'

import * as React from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export type UsageBreakdownRow = { label: string; value: number }

export type UsageMeterProps = {
  /** What is left to spend. */
  remaining: number
  /** The whole allowance for the period. */
  total: number
  /** Names the allowance: "AI credits". */
  label?: string
  /** The plural the numbers count: "credits", "messages". */
  unit?: string
  /** The same word for exactly one: "credit". Defaults to `unit` without its final "s"; pass it for a plural that is not just +s. */
  unitOne?: string
  /** When it refills, as a finished phrase: "Renews 1 November". */
  renews?: string
  /** What the rest will buy, in plain words: "About 150 more long answers." */
  estimate?: string
  /** Where it went so far, one row each. */
  breakdown?: UsageBreakdownRow[]
  /** A button for the card's last row: "Get more credits". */
  action?: React.ReactNode
  /** The share of the total at or under which the meter reads low. 0.1 is a tenth. */
  lowAt?: number
  /** The words a low bar or card shows; every variant speaks them to screen readers. */
  lowLabel?: string
  /** card: everything, for a settings page. bar: the numbers and the bar. compact: a ring and one line, for a composer footer. */
  variant?: 'card' | 'bar' | 'compact'
  /** How the numbers are written. Fixed by default so the server and the browser agree. */
  locale?: string
  className?: string
}

// An amount the app did not clean (NaN, Infinity) counts as nothing rather than printing "NaN".
const finite = (value: number) => (Number.isFinite(value) ? value : 0)

// The stock Progress draws its own track and fill; these reach them by the data-slot it gives each.
// The track has to be seen against the card, whose colour the muted surface nearly matches (1.06:1 at 80%, 1.08:1 at full
// strength, measured on the card in Dawn). So in the light themes it takes a little of the control line's colour. That
// brings the fill's brightness closer to the track than 3:1; it still stands apart by colour, and the amount is always
// written in numbers above the bar (Ryan's call, 2026-10-06). The dark themes keep the full muted surface.
const TRACK = '[&_[data-slot=progress-track]]:h-1.5 [&_[data-slot=progress-track]]:bg-[color-mix(in_oklab,var(--input)_15%,var(--muted))] dark:[&_[data-slot=progress-track]]:bg-muted'
// The one place the AI gradient sits here. A low meter keeps it: "running low" is said in words, the bar never changes colour.
// The gradient is laid across the whole track and the fill reveals it from the left, so a nearly empty bar is plain gold
// and not all three colours squeezed into a dot. The fill is `share` of the track wide, so a background 1/share of the
// fill's own width is exactly the track's width: no measuring.
// Only the width eases when the amount changes (the stock indicator eases everything): a gradient size that eased
// with it would show the wrong colours for the length of the move.
const FILL = '[&_[data-slot=progress-indicator]]:rounded-full [&_[data-slot=progress-indicator]]:ai-meter [&_[data-slot=progress-indicator]]:bg-no-repeat [&_[data-slot=progress-indicator]]:transition-[width] [&_[data-slot=progress-indicator]]:[background-size:calc(100%/var(--usage-share,1))_100%]'

/** Shows how much AI credit is left — the number, a bar in the AI gradient, when it renews, what the rest will buy, and a breakdown — with a compact ring for a composer footer. */
export function UsageMeter({
  remaining, total, label = 'AI credits', unit = 'credits', unitOne, renews, estimate, breakdown, action,
  lowAt = 0.1, lowLabel = 'Running low', variant = 'card', locale = 'en-US', className,
}: UsageMeterProps) {
  const titleId = React.useId()
  // useId keeps the gradient's id unique per meter; a shared id paints every later ring black once the first leaves the page.
  const gradientId = React.useId().replace(/:/g, '')
  const max = Math.max(0, finite(total))
  const left = Math.min(max, Math.max(0, finite(remaining)))
  const share = max > 0 ? left / max : 0
  // Nothing left, or no allowance at all, is low too.
  const low = share <= Math.min(1, Math.max(0, finite(lowAt)))
  const whole = new Intl.NumberFormat(locale)
  const short = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  // "1 credits left" read wrong; one left takes the singular.
  const leftUnit = left === 1 ? (unitOne ?? unit.replace(/s$/, '')) : unit
  const spoken = `${whole.format(left)} of ${whole.format(max)} ${leftUnit} left${low ? `. ${lowLabel}` : ''}`
  const rows = breakdown ?? []

  if (variant === 'compact') {
    return (
      <span data-slot="usage-meter" data-variant="compact" data-low={low || undefined}
        className={cn('inline-flex items-center gap-2 text-xs tabular-nums text-muted-foreground', className)}>
        {/* Turned a quarter so the arc starts at the top. A ring that fills around its edge, never a pie wedge. */}
        <svg aria-hidden width="18" height="18" viewBox="0 0 18 18" className="shrink-0 -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--ai-text-from)" />
              <stop offset="0.5" stopColor="var(--ai-via)" />
              <stop offset="1" stopColor="var(--ai-to)" />
            </linearGradient>
          </defs>
          <circle data-slot="usage-ring-track" cx="9" cy="9" r="7" fill="none" strokeWidth="2.5" className="stroke-[color-mix(in_oklab,var(--input)_15%,var(--muted))] dark:stroke-muted" />
          {/* No arc at zero: a zero-length stroke with round caps still paints a dot. For the same reason any share above zero draws at least 1 of 100: under half a percent would round to a dash of 0. */}
          {share > 0 ? (
            <circle data-slot="usage-arc" cx="9" cy="9" r="7" fill="none" strokeWidth="2.5" strokeLinecap="round" pathLength={100}
              strokeDasharray={`${Math.max(1, Math.round(share * 100))} 100`} stroke={`url(#${gradientId})`} />
          ) : null}
        </svg>
        {/* The visible line is the same low or not; low is for screen readers only, said before the amount. */}
        <span>
          {low ? <span className="sr-only">{lowLabel}: </span> : null}
          {short.format(left)} {leftUnit} left
          <span className="sr-only"> of {whole.format(max)}</span>
        </span>
      </span>
    )
  }

  const meter = (
    <div data-slot="usage-bar" className="grid gap-1.5">
      {/* The total always shows and never shrinks; on a narrow bar the left group wraps under itself instead. */}
      <p className="flex items-baseline justify-between gap-x-3 text-sm tabular-nums">
        <span className="min-w-0 text-ink-soft">
          <span className="text-base font-semibold text-foreground">{whole.format(left)}</span> left
          {/* The dot travels with the words, so a narrow bar wraps to "· Running low" and never leaves the dot hanging. */}
          {low ? <>{' '}<span className="inline-block">{'· '}<span className="font-semibold text-destructive">{lowLabel}</span></span></> : null}
        </span>
        <span className="shrink-0 whitespace-nowrap text-muted-foreground">of {whole.format(max)}</span>
      </p>
      {/* max must be above zero for the primitive; with no allowance the bar is simply empty. */}
      {/* An empty bar draws no fill; the tiny floor only keeps the gradient's size from dividing by zero. */}
      <Progress aria-label={`${label} left`} value={left} max={max > 0 ? max : 1} getAriaValueText={() => spoken} className={cn(TRACK, FILL)}
        style={{ '--usage-share': Math.max(share, 0.0001) } as React.CSSProperties} />
    </div>
  )

  if (variant === 'bar') {
    return <div data-slot="usage-meter" data-variant="bar" data-low={low || undefined} className={cn('text-sm', className)}>{meter}</div>
  }

  return (
    <div data-slot="usage-meter" data-variant="card" data-low={low || undefined} role="group" aria-labelledby={titleId}
      className={cn('grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-sm', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p id={titleId} className="font-semibold text-foreground">{label}</p>
        {renews ? <p className="text-xs text-muted-foreground">{renews}</p> : null}
      </div>
      {meter}
      {estimate ? <p className="text-xs text-muted-foreground">{estimate}</p> : null}
      {rows.length ? (
        <table className="w-full text-xs tabular-nums">
          <caption className="sr-only">Used so far</caption>
          <tbody>
            {rows.map((row, index) => (
              // Labels may repeat; the list is never reordered, so position is a stable key.
              <tr key={index} className="border-t border-border">
                <th scope="row" className="py-1.5 text-left font-normal text-foreground">{row.label}</th>
                <td className="py-1.5 text-right text-muted-foreground">{whole.format(finite(row.value))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {action ? <div className="flex justify-end">{action}</div> : null}
    </div>
  )
}
