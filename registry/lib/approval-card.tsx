'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Icon } from '@/components/ui/icon'
import { AiMark } from '@/components/ui/ai-mark'
import { cn } from '@/lib/utils'

export type ApprovalDetail = { label: string; value: React.ReactNode }

// The card ends each label with a colon so every app's rows read the same ("To:", "Subject:"). A label that already
// ends in a colon or a question mark, in any script, is left alone (no "Subject::", no "Send a copy?:"); a full stop
// is not one of them, because it usually closes an abbreviation ("Qty."). An empty label stays empty, and a label
// that is not text (a plain-JS app can pass a node) is drawn as given.
const withColon = (label: React.ReactNode) => {
  if (typeof label !== 'string') return label
  const trimmed = label.trim()
  return trimmed === '' || /[:：?？؟]$/.test(trimmed) ? trimmed : `${trimmed}:`
}

export type ApprovalCardProps = {
  /** Names the action: "The agent wants to send this email". */
  title: string
  /** Key and value rows that say exactly what will happen: To, Subject, Amount. Pass the bare word; the card adds the colon. */
  details?: ApprovalDetail[]
  /** The content itself. Controlled when passed; leave it out and use defaultBody to let the card keep its own. */
  body?: string
  defaultBody?: string
  onBodyChange?: (body: string) => void
  /** Names the edit field for screen readers: "Email body". */
  bodyLabel?: string
  /** false hides Edit. */
  editable?: boolean
  /** The main button's words. They name the action ("Send email"), never a generic "Approve". */
  actionLabel: string
  actionIcon?: React.ReactNode
  /** Receives the body as it stands, edited or not; undefined when the card has no body. */
  onApprove: (body?: string) => void
  denyLabel?: string
  /** Shows the quiet button on the right. */
  onDeny?: () => void
  /** One line under the buttons: who it reaches, what it costs, or that it cannot be undone. */
  consequence?: string
  /** For actions that delete or cannot be undone: the stock destructive Button. */
  destructive?: boolean
  /** Once the person has decided: one line that replaces the buttons ("Sent to 6 people."). */
  outcome?: string
  className?: string
}

/** Asks before an AI agent acts — an inline card that names the action, shows exactly what will happen, lets people edit it in place, and has a main button that says what it does. */
export function ApprovalCard({
  title, details, body, defaultBody, onBodyChange, bodyLabel = 'Content', editable = true,
  actionLabel, actionIcon, onApprove, denyLabel = 'Deny', onDeny, consequence, destructive = false, outcome, className,
}: ApprovalCardProps) {
  const titleId = React.useId()
  const [ownBody, setOwnBody] = React.useState(defaultBody ?? '')
  const [editing, setEditing] = React.useState(false)
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)
  const hasBody = body !== undefined || defaultBody !== undefined
  const text = body === undefined ? ownBody : body
  const decided = Boolean(outcome)
  const rows = details ?? []
  const showField = editing && !decided
  // A body that was given and is now empty would send nothing; the action waits for text.
  const blank = hasBody && text.trim().length === 0
  // A controlled body with nowhere to report edits would open a field nothing updates: hide Edit instead.
  const canEdit = hasBody && editable && (body === undefined || Boolean(onBodyChange))
  const showTile = rows.length > 0 || text.length > 0 || showField
  const wasDecided = React.useRef(decided)

  // "Opens in place" for a keyboard user means the cursor is in the field.
  React.useEffect(() => { if (showField) fieldRef.current?.focus() }, [showField])

  // Set when the person presses this card's own main or decline button. An outcome can also arrive on its own (a
  // timeout, a decision made on another screen), and focus resting on the page body looks the same in both cases.
  const decidedHere = React.useRef(false)

  // Pressing the main or the decline button removes the button that had focus. Keep the person's place inside the
  // card, but only after a press in this card, and only if they have not moved on to something else since.
  // preventScroll: the line is beside the button they just pressed, so the page has no reason to jump.
  React.useEffect(() => {
    if (decided && !wasDecided.current && decidedHere.current) {
      const active = document.activeElement
      if (!active || active === document.body || cardRef.current?.contains(active)) statusRef.current?.focus({ preventScroll: true })
    }
    if (decided) decidedHere.current = false
    wasDecided.current = decided
  }, [decided])

  const change = (next: string) => {
    if (body === undefined) setOwnBody(next)
    onBodyChange?.(next)
  }

  return (
    <div ref={cardRef} data-slot="approval-card" role="group" aria-labelledby={titleId}
      className={cn('grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}>
      <div className="flex items-center gap-2">
        <AiMark size={15} />
        <p id={titleId} className="min-w-0 flex-1 font-semibold break-words text-ink-soft">{title}</p>
      </div>
      {showTile ? (
        // The divider line, not the control line: the tile is read-only content, told apart from the card by its fill.
        // The control line is kept for things people press or type in.
        <div data-slot="proposal" className="grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5">
          {rows.length ? (
            // Each row reads as a line, one space after the colon ("To: growth@…"), not as two aligned columns.
            <dl className="grid gap-y-1">
              {rows.map((row, index) => (
                // Labels may repeat (two Cc rows); the list is never reordered, so position is a stable key.
                <div key={index} className="min-w-0 break-words">
                  <dt className="inline text-muted-foreground">{withColon(row.label)}</dt>{' '}
                  <dd className="inline text-foreground">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {showField ? (
            <Textarea ref={fieldRef} aria-label={bodyLabel} value={text} onChange={(event) => change(event.target.value)} className="min-h-24 bg-background" />
          ) : text ? (
            <p className="whitespace-pre-wrap break-words text-ink-soft">{text}</p>
          ) : null}
        </div>
      ) : null}
      {decided ? null : (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant={destructive ? 'destructive' : 'default'} disabled={blank} onClick={() => { decidedHere.current = true; onApprove(hasBody ? text : undefined) }}>
            {actionIcon}
            {actionLabel}
          </Button>
          {canEdit ? (
            <Button type="button" variant="outline" className="aria-pressed:bg-muted" aria-pressed={editing} onClick={() => setEditing((was) => !was)}>
              <Icon name="edit" />
              Edit
            </Button>
          ) : null}
          <span className="flex-1" />
          {onDeny ? <Button type="button" variant="ghost" onClick={() => { decidedHere.current = true; onDeny() }}>{denyLabel}</Button> : null}
        </div>
      )}
      {consequence && !decided ? (
        <p className="flex items-center gap-1.5 text-xs break-words text-muted-foreground">
          <Icon name={destructive ? 'warning' : 'info'} size={14} />
          {consequence}
        </p>
      ) : null}
      {/* On the page from the start so the outcome arrives into a live region. While empty it is absolutely
          positioned: a real box that takes no grid row and no gap. With words in it the box is only as wide as
          they are, with a little room on every side paid back in negative margin, so the focus ring it gets after a
          decision hugs the words and neither the words nor the card move. */}
      <div ref={statusRef} role="status" tabIndex={-1} className="rounded-md outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50 empty:absolute not-empty:w-fit not-empty:max-w-[calc(100%+0.75rem)] not-empty:-mx-1.5 not-empty:-my-0.5 not-empty:px-1.5 not-empty:py-0.5">
        {outcome ? <p className="text-xs break-words text-muted-foreground">{outcome}</p> : null}
      </div>
    </div>
  )
}
