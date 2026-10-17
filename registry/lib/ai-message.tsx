'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { AiMark } from '@/components/ui/ai-mark'
import { cn } from '@/lib/utils'

export type AiFeedback = 'up' | 'down' | null

export type AiMessageProps = {
  /** The answer. Plain paragraphs, lists and Citation chips. Leave it out while the AI is still thinking. */
  children?: React.ReactNode
  name?: string
  /** Hides the name from view when something nearby already says who is answering (a panel titled "Assistant"). Screen readers still read it. */
  hideName?: boolean
  /** An AiThinking above the answer. Leave it out when there is none: with hideName, a component passed here that renders nothing still counts as the first row beside the avatar. */
  thinking?: React.ReactNode
  /** A Sources list under the answer. */
  sources?: React.ReactNode
  /** The answer is still arriving: shows a caret, hides the actions, marks the reply busy. */
  streaming?: boolean
  /** The person stopped the answer part-way. */
  stopped?: boolean
  /** What Copy puts on the clipboard; defaults to the answer's visible text. */
  copyText?: string
  onRetry?: () => void
  /** Controlled thumbs; omit to let the message keep its own. */
  feedback?: AiFeedback
  onFeedback?: (value: AiFeedback) => void
  /** Drawn under the actions only while thumbs-down is pressed: an AiFeedbackForm asking what was wrong. */
  feedbackForm?: React.ReactNode
  className?: string
}

// Elements with no children that still show something.
const SELF_CLOSING_CONTENT = new Set(['img', 'hr', 'br', 'svg', 'video', 'audio', 'canvas', 'iframe', 'input', 'object', 'embed', 'math'])

// Whether the answer shows anything, judged by what it contains rather than how many children there are:
// '', whitespace, an empty fragment and <p>{''}</p> are all "no answer yet".
function hasVisibleContent(node: React.ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') return false
  if (typeof node === 'string') return node.trim().length > 0
  if (typeof node === 'number') return true
  if (Array.isArray(node)) return node.some(hasVisibleContent)
  if (React.isValidElement<{ children?: React.ReactNode; dangerouslySetInnerHTML?: { __html?: string } }>(node)) {
    // A component (a Citation chip, say) renders something we cannot see from here, so it counts.
    if (typeof node.type !== 'string' && node.type !== React.Fragment) return true
    if (typeof node.type === 'string' && SELF_CLOSING_CONTENT.has(node.type)) return true
    // Apps often render markdown as raw HTML, which is an element with no children at all.
    if (node.props.dangerouslySetInnerHTML?.__html?.trim()) return true
    return hasVisibleContent(node.props.children)
  }
  return true
}

// With the name hidden, the first row beside the avatar takes the centre line the name row had. Half of what is left
// of the avatar's 28px after one line of the row's own text (1lh), so it holds for every text size.
const LEVEL_WITH_AVATAR = 'pt-[calc((1.75rem-1lh)/2)]'

/** An AI's reply in a conversation — the AI mark on its avatar, the answer as plain readable text, and Copy, Try again and thumbs under it. Ships with UserMessage for the person's side. */
export function AiMessage({
  children, name = 'Assistant', hideName = false, thinking, sources, streaming = false, stopped = false,
  copyText, onRetry, feedback, onFeedback, feedbackForm, className,
}: AiMessageProps) {
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const articleRef = React.useRef<HTMLElement>(null)
  const [copied, setCopied] = React.useState(false)
  const copiedTimer = React.useRef<number | undefined>(undefined)
  const [ownFeedback, setOwnFeedback] = React.useState<AiFeedback>(null)
  const current = feedback === undefined ? ownFeedback : feedback
  // Without answer text there is nothing to put a caret beside or to copy.
  const hasAnswer = hasVisibleContent(children)
  // A stopped reply with no answer has no actions; an empty group would still be announced.
  const hasActions = hasAnswer || Boolean(onRetry) || Boolean(onFeedback)
  const hasThinking = thinking !== undefined && thinking !== null && thinking !== false
  // Which row comes first beside the avatar once the name is out of view.
  const levelRow = !hideName ? null : hasThinking ? 'thinking' : hasAnswer ? 'answer' : stopped ? 'stopped' : null

  const mounted = React.useRef(false)
  // The clipboard write is async, so the reply may be gone by the time it finishes: a timer started then would never be cleared.
  // A pending "Copied" reset must also not cut a second copy's two seconds short.
  React.useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(copiedTimer.current)
    }
  }, [])

  const vote = (value: 'up' | 'down') => {
    const next = current === value ? null : value
    if (feedback === undefined) setOwnFeedback(next)
    onFeedback?.(next)
  }

  // Truthiness, so 0 and '' do not draw an empty wrapper; any real node still counts.
  const showForm = current === 'down' && Boolean(feedbackForm)
  const hadForm = React.useRef(showForm)
  // Whether keyboard focus was last seen inside the form. A control that is removed while focused sends no blur.
  const focusInForm = React.useRef(false)
  // The form's own Close takes the focused button with it; send the cursor back to the thumb that opened the form.
  // Only when focus was in the form and has fallen to the page: a form the app removes for its own reasons moves nothing.
  React.useEffect(() => {
    if (hadForm.current && !showForm && focusInForm.current) {
      const active = document.activeElement
      if (!active || active === document.body) articleRef.current?.querySelector<HTMLElement>('[aria-label="Bad answer"]')?.focus({ preventScroll: true })
    }
    if (!showForm) focusInForm.current = false
    hadForm.current = showForm
  }, [showForm])
  // Clicking blank page blurs with no relatedTarget, which the form's onBlur cannot tell from "the control was removed".
  // A press outside the form while it is shown says the person has moved on, so a later removal must not pull focus back.
  React.useEffect(() => {
    if (!showForm) return
    const onPointerDown = (event: PointerEvent) => {
      const wrapper = articleRef.current?.querySelector('[data-slot="reply-feedback"]')
      if (!wrapper || !(event.target instanceof Node) || !wrapper.contains(event.target)) focusInForm.current = false
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [showForm])
  // Citation chips and the caret are inline, so reading the body directly would glue their labels onto the sentence.
  // innerText only inserts line breaks for laid-out nodes, so the stripped copy is attached invisibly just long enough to read.
  const answerText = () => {
    const body = bodyRef.current
    if (!body?.parentNode) return ''
    const clone = body.cloneNode(true) as HTMLElement
    clone.querySelectorAll('[data-slot="citation"], [data-slot="caret"]').forEach((node) => node.remove())
    clone.setAttribute('aria-hidden', 'true')
    clone.style.cssText = 'position:absolute;opacity:0;pointer-events:none;inset-inline-start:0'
    body.after(clone)
    try {
      return clone.innerText.trim().replace(/\n{3,}/g, '\n\n')
    } finally {
      clone.remove()
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText ?? answerText())
      if (!mounted.current) return
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // The browser refused (no permission, insecure page); the button simply stays "Copy".
    }
  }

  return (
    // relative: the boxes kept for screen readers only (the hidden name, AiThinking's status) are absolutely
    // positioned, and must take their place from this reply so they scroll with it inside a scrolling thread.
    <article ref={articleRef} data-slot="ai-message" aria-busy={streaming || undefined} className={cn('relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2.5', className)}>
      <span aria-hidden data-slot="reply-avatar" className="grid size-7 place-items-center rounded-full border border-border bg-background">
        <AiMark size={15} />
      </span>
      <div className="grid min-w-0 gap-1.5">
        {/* Same 28px height as the avatar, so the name sits on the avatar's centre line. Hidden, it stays for screen
            readers (the avatar is decoration, so the name is the only speaker label) as a box that takes no grid row. */}
        <div data-slot="reply-name" className={hideName ? 'sr-only' : 'flex min-h-7 items-center'}>
          <p className="text-xs font-semibold text-muted-foreground">{name}</p>
        </div>
        {/* text-sm is the size of AiThinking's first line, which is what 1lh has to measure here. */}
        {levelRow === 'thinking' ? <div className={cn('text-sm', LEVEL_WITH_AVATAR)}>{thinking}</div> : thinking}
        {hasAnswer ? (
          // While streaming, the last paragraph runs inline so the caret sits at the end of its last line.
          <div ref={bodyRef} data-slot="reply-body" className={cn('text-sm leading-relaxed text-foreground [&>*+*]:mt-2', streaming && '[&>p:last-of-type]:inline', levelRow === 'answer' && LEVEL_WITH_AVATAR)}>
            {children}
            {streaming ? <span aria-hidden data-slot="caret" className="ml-0.5 inline-block h-[1.05em] w-2 animate-pulse bg-foreground align-[-0.15em] motion-reduce:animate-none" /> : null}
          </div>
        ) : null}
        {/* Stays mounted so the text arrives into a live region instead of appearing with it. While empty it is
            absolutely positioned, so it is a real box that takes no grid row (and no gap); with text it is in flow. */}
        <div role="status" className={cn('text-xs empty:absolute', levelRow === 'stopped' && LEVEL_WITH_AVATAR)}>
          {stopped ? <p className="text-muted-foreground">You stopped this answer.</p> : null}
        </div>
        {sources}
        {!streaming && hasActions ? (
          <div role="group" aria-label="Reply actions" className="-ml-1.5 flex gap-0.5 text-muted-foreground">
            {hasAnswer ? (
              <Button type="button" variant="ghost" size="icon-sm" aria-label={copied ? 'Copied' : 'Copy'} onClick={copy}>
                <Icon name={copied ? 'check' : 'content_copy'} />
              </Button>
            ) : null}
            {onRetry ? (
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Try again" onClick={onRetry}><Icon name="refresh" /></Button>
            ) : null}
            {onFeedback ? (
              <>
                <Button type="button" variant="ghost" size="icon-sm" className="aria-pressed:bg-muted aria-pressed:text-foreground" aria-label="Good answer" aria-pressed={current === 'up'} onClick={() => vote('up')}><Icon name="thumb_up" /></Button>
                <Button type="button" variant="ghost" size="icon-sm" className="aria-pressed:bg-muted aria-pressed:text-foreground" aria-label="Bad answer" aria-pressed={current === 'down'} onClick={() => vote('down')}><Icon name="thumb_down" /></Button>
              </>
            ) : null}
          </div>
        ) : null}
        {showForm && !streaming ? (
          <div data-slot="reply-feedback"
            onFocus={() => { focusInForm.current = true }}
            onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) focusInForm.current = false }}>
            {feedbackForm}
          </div>
        ) : null}
      </div>
    </article>
  )
}

/** The person's side of an AI conversation: their message, right-aligned in a warm bubble. */
export function UserMessage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-slot="user-message" className={cn('ml-auto w-fit max-w-[80%] rounded-xl rounded-br-sm border border-border bg-card px-3.5 py-2 text-sm', className)}>
      {children}
    </div>
  )
}
