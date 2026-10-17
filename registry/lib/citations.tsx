'use client'

import * as React from 'react'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export type Source = {
  title: string
  /** Short chip text, e.g. "Q3 deck". Without it the chip shows the title, truncated. */
  label?: string
  /** Where in the source, or its address: "Page 4", "example.com/changelog". */
  detail?: string
  /** A line from the source, shown in the preview. */
  snippet?: string
  /** Opens in a new tab when given; without it the chip is a button that opens its preview when pressed. */
  href?: string
  kind?: 'file' | 'web'
}

// The focus ring is the stock Button's, so these plain buttons and links match the controls around them.
// Truncation keeps a long title from turning one chip into a line-wide bar; the full title stays in the accessible name.
// mx-1.5 leaves 3px clear outside the 3px focus ring on both sides, so the chip never touches the words around it however it is placed.
const CHIP = 'mx-1.5 inline-block h-5 max-w-chip truncate rounded-md bg-muted px-2 text-center align-middle text-2xs font-semibold leading-5 text-ink-soft no-underline hover:bg-foreground hover:text-background outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50'
const kindIcon = (s: Source) => (s.kind === 'web' ? 'language' : 'description')

function where(s: Source) {
  if (s.detail) return s.detail
  if (!s.href) return s.kind === 'web' ? 'Web page' : 'File'
  try { return new URL(s.href).hostname } catch { return s.href }
}

/** Shows where an AI answer came from — a small chip after each claim, named for its source, that previews it, and an "N sources" list under the answer. */
export function Citation({ source, className }: { source: Source; className?: string }) {
  // WCAG 2.5.3: the accessible name must start with the visible chip text.
  const name = source.label ? `${source.label}, source: ${source.title}` : `Source: ${source.title}`
  // A chip with a link already has a press (follow it); one without gets the preview as its press.
  const pressable = !source.href
  // Always controlled, so a chip whose href comes or goes while mounted never flips the card between controlled and uncontrolled.
  const [open, setOpen] = React.useState(false)
  // A press pins the card open. Hover or focus may already have opened it, and a press must never be the thing
  // that closes it, so the first press pins and only the next press (or Escape, an outside press, focus leaving) lets go.
  const [pinned, setPinned] = React.useState(false)
  // A chip that gains or loses its link must not carry an open, pinned card across; reset during render, the React-sanctioned way to react to a prop change.
  const [wasPressable, setWasPressable] = React.useState(pressable)
  if (wasPressable !== pressable) {
    setWasPressable(pressable)
    setPinned(false)
    setOpen(false)
  }
  const chipRef = React.useRef<HTMLAnchorElement>(null)
  const release = () => { setPinned(false); setOpen(false) }
  return (
    <HoverCard
      open={open}
      onOpenChange={(nextOpen, details) => {
        // While pinned the pointer leaving must not close the card. Focus leaving does close it, and the primitive
        // ignores focus moving into the card itself, so pressing inside the card does not count as leaving.
        if (!nextOpen && pinned && details.reason === 'trigger-hover') return
        if (!nextOpen) setPinned(false)
        setOpen(nextOpen)
      }}
    >
      <HoverCardTrigger
        render={source.href
          ? <a href={source.href} target="_blank" rel="noreferrer" aria-label={name} />
          : <button type="button" aria-label={name} aria-expanded={open} />}
        ref={chipRef}
        data-slot="citation"
        className={cn(CHIP, className)}
        {...(pressable && {
          onClick: () => (pinned ? release() : (setPinned(true), setOpen(true))),
        })}
      >
        {source.label ?? source.title}
      </HoverCardTrigger>
      {/* Focus can rest inside the card after a press in it; leaving it for anywhere but the chip or the card lets go. */}
      <HoverCardContent
        className="grid w-panel gap-1"
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null
          if (!pinned || next === chipRef.current || event.currentTarget.contains(next)) return
          release()
        }}
      >
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon name={kindIcon(source)} size={13} />{where(source)}</span>
        <span className="font-semibold">{source.title}</span>
        {source.snippet ? <span className="text-muted-foreground">{source.snippet}</span> : null}
      </HoverCardContent>
    </HoverCard>
  )
}

/** "N sources" under an AI answer, opening the list the chips point to. */
export function Sources({ sources, defaultOpen = false, className }: { sources: Source[]; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const listId = React.useId()
  if (!sources.length) return null
  return (
    <div data-slot="sources" className={cn('grid justify-items-start gap-2', className)}>
      <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="inline-flex h-7 items-center gap-2 rounded-full border border-border bg-background pr-2.5 pl-1.5 text-xs font-semibold text-ink-soft hover:bg-muted outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        <span aria-hidden className="flex">
          {sources.slice(0, 3).map((source, index) => (
            <span key={index} className={cn('grid size-4.5 place-items-center rounded-full border-2 border-background bg-muted', index > 0 && '-ml-1.5')}>
              <Icon name={kindIcon(source)} size={10} />
            </span>
          ))}
        </span>
        {sources.length === 1 ? '1 source' : `${sources.length} sources`}
      </button>
      {/* A list, not a numbered one: chips are named, so order carries no meaning. */}
      <ul id={listId} hidden={!open} className="grid w-full gap-0.5 rounded-lg border border-border bg-background p-1">
        {sources.map((source, index) => {
          const body = (
            <>
              <span aria-hidden className="grid size-6 place-items-center rounded-md bg-muted text-ink-soft"><Icon name={kindIcon(source)} size={14} /></span>
              <span className="grid min-w-0">
                <span className="truncate font-semibold">{source.title}</span>
                {source.detail ? <span className="truncate text-xs text-muted-foreground">{source.detail}</span> : null}
              </span>
            </>
          )
          const row = 'grid grid-cols-[1.375rem_minmax(0,1fr)] items-start gap-2.5 rounded-md p-2 text-sm'
          return (
            <li key={index}>
              {source.href
                ? <a href={source.href} target="_blank" rel="noreferrer" className={cn(row, 'text-foreground no-underline hover:bg-card outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50')}>{body}</a>
                : <div className={row}>{body}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
