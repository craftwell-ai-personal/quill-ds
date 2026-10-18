'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AiMark } from '@/components/ui/ai-mark'
import { ToneBadge } from '@/components/ui/tone-badge'
import { cn } from '@/lib/utils'

/** The value of the free-text row. */
export const OTHER_ANSWER = '__other__'

export type QuestionOption = {
  value: string
  label: string
  /** One line on what choosing this means. */
  description?: string
}

/** `text` is set only for the free-text row. */
export type QuestionAnswer = { value: string; text?: string }

export type QuestionCardProps = {
  /** The question, in plain words. It names the radio group. */
  question: string
  options: QuestionOption[]
  /** Names the card for screen readers; the question names the options, so each is read once. */
  title?: string
  /** The value of the agent's pick: it moves to the top and gets the "Recommended" tag. */
  recommended?: string
  /** The free-text row, always last. */
  otherLabel?: string
  otherDescription?: string
  otherPlaceholder?: string
  /** Controlled when passed (null means nothing chosen); leave it out to let the card keep its own. */
  answer?: QuestionAnswer | null
  onAnswerChange?: (answer: QuestionAnswer | null) => void
  onContinue: (answer: QuestionAnswer) => void
  continueLabel?: string
  /** Shows the skip button. */
  onSkip?: () => void
  skipLabel?: string
  /** Once answered: one line that replaces the buttons ("Sending it to the growth team."). The rows lock. */
  outcome?: string
  className?: string
}

/** An AI agent asks the person to choose — the question, options as full rows with the recommended one first, a free-text row for anything else, and Continue that waits for an answer. */
export function QuestionCard({
  question, options, title = 'The agent has a question', recommended,
  otherLabel = 'Something else', otherDescription = 'Tell the agent what you want.', otherPlaceholder,
  answer, onAnswerChange, onContinue, continueLabel = 'Continue', onSkip, skipLabel = 'Skip, let the agent decide', outcome, className,
}: QuestionCardProps) {
  const baseId = React.useId()
  const [ownAnswer, setOwnAnswer] = React.useState<QuestionAnswer | null>(null)
  // What was last typed in the field, so choosing another row and coming back does not lose it.
  const lastText = React.useRef('')
  const decided = Boolean(outcome)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)
  const wasDecided = React.useRef(decided)
  // A controlled answer with nowhere to report changes would give rows that do nothing: lock them instead.
  const locked = decided || (answer !== undefined && !onAnswerChange)

  // Set when the person presses this card's own Continue or Skip, or Enter in its field. An outcome can also arrive on
  // its own (a timeout, a decision made on another screen), and focus resting on the page body looks the same in both cases.
  const decidedHere = React.useRef(false)

  // Pressing Continue or Skip removes the button that had focus. Keep the person's place inside the card, but only
  // after a press in this card, and only if they have not moved on to something else since.
  // preventScroll: the line is beside the button they just pressed, so the page has no reason to jump.
  React.useEffect(() => {
    if (decided && !wasDecided.current && decidedHere.current) {
      const active = document.activeElement
      if (!active || active === document.body || cardRef.current?.contains(active)) statusRef.current?.focus({ preventScroll: true })
    }
    if (decided) decidedHere.current = false
    wasDecided.current = decided
  }, [decided])

  // A value can belong to one row only: later repeats, and rows borrowing the free-text value, are dropped.
  const unique = options.filter((option, index) => (
    option.value !== OTHER_ANSWER && options.findIndex((other) => other.value === option.value) === index
  ))
  const lead = unique.find((option) => option.value === recommended)
  const rows: QuestionOption[] = [
    ...(lead ? [lead, ...unique.filter((option) => option !== lead)] : unique),
    { value: OTHER_ANSWER, label: otherLabel, description: otherDescription },
  ]

  const given = answer === undefined ? ownAnswer : answer
  // A chosen value no row has (a retired option) counts as nothing chosen.
  const current = given && rows.some((option) => option.value === given.value) ? given : null
  const isOther = current?.value === OTHER_ANSWER
  const text = current?.value === OTHER_ANSWER ? current.text ?? '' : ''
  const ready = current !== null && (!isOther || text.trim().length > 0)

  const change = (next: QuestionAnswer | null) => {
    if (answer === undefined) setOwnAnswer(next)
    onAnswerChange?.(next)
  }
  const choose = (value: string) => {
    if (locked || value === current?.value) return
    change(value === OTHER_ANSWER ? { value, text: lastText.current } : { value })
  }
  const submit = () => {
    if (!ready || !current) return
    decidedHere.current = true
    onContinue(isOther ? { value: OTHER_ANSWER, text: text.trim() } : { value: current.value })
  }

  return (
    <div ref={cardRef} data-slot="question-card" role="group" aria-labelledby={`${baseId}-card-title`}
      className={cn('grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 text-sm shadow-sm', className)}>
      <div className="flex items-center gap-2">
        <AiMark size="icon-md" />
        <p id={`${baseId}-card-title`} className="min-w-0 flex-1 font-semibold break-words text-ink-soft">{title}</p>
      </div>
      <p id={`${baseId}-question`} className="font-semibold break-words text-foreground">{question}</p>
      <RadioGroup aria-labelledby={`${baseId}-question`} value={current?.value ?? null} onValueChange={(value) => choose(String(value))} disabled={locked} className="grid-cols-[minmax(0,1fr)] gap-1.5">
        {rows.map((option, index) => {
          const selected = current?.value === option.value
          const tagged = lead !== undefined && option === lead
          const titleId = `${baseId}-title-${index}`
          const tagId = `${baseId}-tag-${index}`
          const lineId = `${baseId}-line-${index}`
          return (
            // The whole row is the target. A press on the radio is left to the radio group (it clicks its own hidden
            // input, whose click does not reach this row), so one press never reports two changes. A press in the
            // field reaches the row but the row is already chosen, so choose() does nothing.
            <div key={option.value} data-slot="question-option"
              onClick={(event) => { if (!(event.target as HTMLElement).closest('[role="radio"]')) choose(option.value) }}
              className={cn(
                'grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-2.5 rounded-lg border bg-background px-3 py-2.5',
                // border-input, not the divider line: an option row is a control and must read as a shape in the dark themes.
                selected ? 'border-foreground ring-1 ring-foreground ring-inset' : 'border-input',
                locked ? 'cursor-default' : 'cursor-pointer',
                !locked && !selected && 'hover:border-foreground',
              )}>
              {/* A box one line tall keeps the radio on the title's line. */}
              <span className="flex h-[1lh] items-center">
                <RadioGroupItem value={option.value} aria-labelledby={tagged ? `${titleId} ${tagId}` : titleId} aria-describedby={option.description ? lineId : undefined} />
              </span>
              <span className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5">
                <span className="flex flex-wrap items-center gap-x-1.5">
                  <span id={titleId} data-slot="option-title" className="font-semibold break-words text-foreground min-w-0">{option.label}</span>
                  {tagged ? <span id={tagId} className="inline-flex"><ToneBadge tone="moss" size="sm">Recommended</ToneBadge></span> : null}
                </span>
                {option.description ? <span id={lineId} className="text-xs break-words text-muted-foreground">{option.description}</span> : null}
                {option.value === OTHER_ANSWER && selected ? (
                  <Input
                    aria-label={`${question}: ${option.label}`}
                    aria-describedby={option.description ? lineId : undefined}
                    placeholder={otherPlaceholder}
                    value={text}
                    disabled={locked}
                    className="mt-1.5 bg-background"
                    onChange={(event) => { lastText.current = event.target.value; change({ value: OTHER_ANSWER, text: event.target.value }) }}
                    onKeyDown={(event) => {
                      // The radio group listens for arrow keys on everything inside it, and with the caret at either end
                      // of the text it would move to (and choose) another option. In the field, arrows move the caret.
                      if (event.key.startsWith('Arrow')) { event.stopPropagation(); return }
                      // Enter that only confirms a word in an input method (Japanese, Chinese, Korean) is not "continue".
                      // Chrome marks it isComposing; Safari sends it just after, as keyCode 229.
                      if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) submit()
                    }}
                  />
                ) : null}
              </span>
            </div>
          )
        })}
      </RadioGroup>
      {decided ? null : (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" disabled={!ready} onClick={submit}>{continueLabel}</Button>
          <span className="flex-1" />
          {onSkip ? <Button type="button" variant="ghost" onClick={() => { decidedHere.current = true; onSkip() }}>{skipLabel}</Button> : null}
        </div>
      )}
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
