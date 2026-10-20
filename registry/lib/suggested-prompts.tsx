'use client'

import * as React from 'react'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export type Suggestion = {
  /** What the button says. */
  label: string
  /** A second line, shown in the cards layout. */
  detail?: string
  /** What goes into the composer; defaults to the label. */
  prompt?: string
}

/** Ready-made things to ask an AI — chips for follow-ups under an answer, cards for starters on an empty page, a list in a narrow panel. Picking one fills the composer; it never sends. */
export function SuggestedPrompts({
  suggestions, layout = 'chips', onPick, label = 'Suggestions', className,
}: {
  suggestions: Suggestion[]
  layout?: 'chips' | 'cards' | 'list'
  onPick: (prompt: string) => void
  label?: string
  className?: string
}) {
  const pick = (s: Suggestion) => onPick(s.prompt ?? s.label)
  const list = {
    chips: 'flex flex-wrap gap-1.5',
    cards: 'grid grid-cols-2 gap-2 sm:grid-cols-4',
    list: 'grid [&>li:last-child>button]:border-b',
  }[layout]
  return (
    <ul aria-label={label} data-slot="suggested-prompts" data-layout={layout} className={cn(list, className)}>
      {suggestions.map((s, index) => (
        // The index keeps two suggestions with the same label apart; the list is never reordered, so it is a stable key.
        <li key={`${index}-${s.label}`}>
          {layout === 'cards' ? (
            <button type="button" onClick={() => pick(s)}
              className="grid w-full gap-0.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left hover:border-input outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              <span className="text-sm font-semibold">{s.label}</span>
              {s.detail ? <span className="truncate text-xs text-muted-foreground">{s.detail}</span> : null}
            </button>
          ) : layout === 'list' ? (
            <button type="button" onClick={() => pick(s)}
              className="flex w-full items-center gap-2.5 border-t border-border px-1 py-2.5 text-left text-sm hover:bg-card outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
              {s.label}
              <Icon name="arrow_forward" className="size-icon-md ml-auto text-muted-foreground" />
            </button>
          ) : (
            <button type="button" onClick={() => pick(s)}
              className="inline-flex h-8 items-center rounded-full border border-border bg-background px-3 text-sm text-ink-soft hover:bg-muted hover:text-foreground outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
              {s.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
