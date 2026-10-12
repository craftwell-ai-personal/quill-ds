'use client'

import * as React from 'react'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { AiMark } from '@/components/ui/ai-mark'
import { PromptComposer } from '@/components/ui/prompt-composer'
import { AiMessage, UserMessage } from '@/components/ui/ai-message'
import { AiThinking } from '@/components/ui/ai-thinking'
import { Citation, type Source } from '@/components/ui/citations'
import { SuggestedPrompts } from '@/components/ui/suggested-prompts'
import { cn } from '@/lib/utils'

const SOURCE: Source = { title: 'Changelog: new pricing page', label: 'changelog', detail: 'example.com/changelog', snippet: 'Shipped 9 September: annual plans shown first.', kind: 'web' }

type Turn = { id: number; ask: string; reply: 'working' | 'stopped' }

// One literal on purpose: the Figma parity check counts every <Icon name="…"> in this file, and the panel drawn on
// its own shows a single close (the chip's). The Sheet's Close reuses this.
const closeIcon = (size?: number) => <Icon name="close" size={size} />

// The thread has to move this many px before the fade appears: its top padding. Less than that and nothing has gone
// under the header yet, so a trackpad nudge would only fade the scope chip where it sits.
const THREAD_FADE_AFTER = 4

// React draws nothing for these, so a prop holding one is "nothing passed": `text && <List />` with an empty string.
const drawsNothing = (node: React.ReactNode) => node === undefined || node === null || typeof node === 'boolean' || node === ''

// The Sheet's own element, for the panel inside AiSidePanel: the one thing outside itself the panel may send focus to.
const SheetElement = React.createContext<React.RefObject<HTMLElement | null> | null>(null)

// A device whose main pointer is a finger. Why that decides where focus goes is told once, at the Sheet below.
const onTouchScreen = () => window.matchMedia('(pointer: coarse)').matches

export type AiPanelProps = {
  title?: string
  /** What the assistant can see: "Q3 report". Pass a string or null to control it; leave it out and the panel keeps its own. */
  scope?: string | null
  /** Called when the chip's remove button is pressed. A scope you control needs this, or the chip has no remove button. */
  onScopeRemove?: () => void
  /** History only calls this; the panel has no past-chats view of its own. Left out, the History button is not drawn. */
  onHistory?: () => void
  /** A close control for the header. AiSidePanel passes the Sheet's own. */
  close?: React.ReactNode
  /** The message box, for a wrapper that sends focus there. AiSidePanel passes its own, to open with the cursor in the box. */
  composerRef?: React.RefObject<HTMLTextAreaElement | null>
  onSubmit?: (value: string) => void
  /** Your own conversation: UserMessage, AiMessage and cards, each turn a direct child. Passing anything but undefined replaces the sample conversation: no sample messages, no sample follow-up, and sending adds nothing by itself (add the turn in onSubmit). Unlike body, null, false and an empty list count as passed here: they are your thread with nothing in it yet, so only undefined shows the sample. Replies in a panel should pass hideName: the header already says who is answering. */
  children?: React.ReactNode
  /** With your own conversation: 'working' while a reply is being written, which shows Stop. Not read while the sample is shown. */
  status?: 'idle' | 'working'
  /** With your own conversation: called when Stop is pressed. The cursor goes back to the message box either way. */
  onStop?: () => void
  /** The message box's text. Pass a string to control it (and clear it yourself after onSubmit); leave it out and the panel keeps its own. */
  value?: string
  onValueChange?: (value: string) => void
  /** Shown in place of the thread (the scope chip and the messages) for as long as it is passed: your list of past chats while History is open, for example. The header and the composer stay. Anything React draws nothing for (undefined, null, true, false, an empty string) means "no body", so `open ? <List /> : null` and `open && <List />` both work, and the thread is back where it was. */
  body?: React.ReactNode
  className?: string
}

/** The assistant panel on its own (header, scope chip, thread and composer on one AI wash), for a layout that gives it its own column. */
export function AiPanel({
  title = 'Assistant', scope, onScopeRemove, onHistory, close, composerRef: givenComposerRef, onSubmit = () => {},
  children, status = 'idle', onStop, value: givenValue, onValueChange, body, className,
}: AiPanelProps) {
  const titleId = React.useId()
  const [ownScope, setOwnScope] = React.useState<string | null>('Q3 report')
  const currentScope = scope === undefined ? ownScope : scope
  // A scope the app controls, with nothing to call, cannot be removed: no dead button.
  const removable = scope === undefined || Boolean(onScopeRemove)
  const [ownValue, setOwnValue] = React.useState('')
  const value = givenValue === undefined ? ownValue : givenValue
  const setValue = (next: string) => {
    if (givenValue === undefined) setOwnValue(next)
    onValueChange?.(next)
  }
  const [turns, setTurns] = React.useState<Turn[]>([])
  // The app's own conversation, or (left out) the sample one, which this panel keeps going with pretend replies.
  const ownsThread = children !== undefined
  const turnCount = ownsThread ? React.Children.count(children) : turns.length
  // Anything React draws nothing for is "no body", so `open ? <List /> : null` and `open && <List />` both show the thread while closed.
  const hasBody = !drawsNothing(body)
  const ownComposerRef = React.useRef<HTMLTextAreaElement>(null)
  const composerRef = givenComposerRef ?? ownComposerRef
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const working = ownsThread ? status === 'working' : turns.at(-1)?.reply === 'working'
  // Whether a message has been scrolled under the header: only then is there something to fade.
  const [scrolled, setScrolled] = React.useState(false)

  // A new turn is added at the bottom of a thread that may already be scrolled; keep the newest in view.
  // An app's thread also opens on its newest turn, and comes back to it when the app starts writing a reply.
  // Where the thread was when something else took its place; while that shows, "the newest" is remembered instead.
  const threadTop = React.useRef(0)
  const showsBody = React.useRef(hasBody)
  const toNewest = React.useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    if (showsBody.current) threadTop.current = Number.MAX_SAFE_INTEGER
    else scroller.scrollTop = scroller.scrollHeight
  }, [])
  React.useEffect(() => {
    if (turnCount > 0) toNewest()
  }, [turnCount, toNewest])
  const writing = ownsThread && working
  React.useEffect(() => {
    if (writing) toNewest()
  }, [writing, toNewest])
  // `body` takes the thread's place in the same scrolling area: it starts at its own top, and the thread returns to
  // where it was. If the cursor was on something in the body, that is gone now; it lands in the message box, or on a
  // touch screen on the panel itself: the Sheet's own element, or drawn inline this section, which is made focusable
  // until focus leaves it again. Never an element of the app's.
  const panelRef = React.useRef<HTMLElement>(null)
  const sheet = React.useContext(SheetElement)
  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || showsBody.current === hasBody) return
    showsBody.current = hasBody
    scroller.scrollTop = hasBody ? 0 : threadTop.current
    const active = document.activeElement
    if (hasBody || (active !== null && active !== document.body)) return
    if (!onTouchScreen()) return composerRef.current?.focus()
    if (sheet?.current) return sheet.current.focus()
    const section = panelRef.current
    if (!section) return
    if (!section.hasAttribute('tabindex')) {
      section.tabIndex = -1
      section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true })
    }
    section.focus()
  }, [hasBody, composerRef, sheet])

  const removeScope = () => {
    if (scope === undefined) setOwnScope(null)
    onScopeRemove?.()
    // The button that was pressed is about to unmount; without this keyboard focus falls to the page.
    composerRef.current?.focus()
  }

  return (
    // One wash on the panel itself, top to bottom, behind all three parts: a band on the header alone reads as a hard edge.
    <section ref={panelRef} aria-labelledby={titleId} className={cn('ai-wash grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] bg-popover text-sm text-popover-foreground', className)}>
      {/* min-h-12 = a 28px button plus the padding, so the header keeps its height with or without History and Close. */}
      <div className="flex min-h-12 items-center gap-2 py-2.5 pr-2.5 pl-3.5">
        <AiMark size={18} />
        {/* A paragraph, not a heading: headings take the serif display preset. */}
        <p id={titleId} className="min-w-0 flex-1 truncate font-semibold text-foreground">{title}</p>
        {onHistory ? <Button type="button" variant="ghost" size="icon-sm" aria-label="History" onClick={onHistory}><Icon name="history" /></Button> : null}
        {close}
      </div>
      {/* The inner block is pushed to the bottom with an auto margin, which (unlike aligning the content to the end)
          keeps the top reachable when the thread grows past the panel and scrolls. */}
      {/* Messages scrolled under the header fade out through a mask: it has no colour of its own, so the wash shows
          through in every theme, and it is not an element, so it takes no presses. The fade is as deep as a reply's
          avatar. scroll-pt keeps a control reached by keyboard below it, where its focus ring is drawn in full.
          relative: kit pieces placed in the thread keep absolutely positioned boxes for screen readers, which must
          take their place from the thread to scroll with it instead of hanging below the panel. */}
      <div ref={scrollerRef} data-slot="thread"
        onScroll={(event) => {
          setScrolled(event.currentTarget.scrollTop > THREAD_FADE_AFTER)
          if (!hasBody) threadTop.current = event.currentTarget.scrollTop
        }}
        className={cn('relative flex min-h-0 scroll-pt-8 flex-col overflow-y-auto px-3.5 pt-1 pb-2.5', scrolled && '[mask-image:linear-gradient(to_bottom,transparent,black_1.75rem)]')}>
        {/* Kept on the page (hidden) while something else is shown, so cards in the thread keep what was typed in them. */}
        <div hidden={hasBody || undefined} className="mt-auto grid min-w-0 gap-3">
          {currentScope ? (
            // border-input, not the divider line: the chip has to read as a shape on the wash in the dark themes.
            <span data-slot="scope-chip" className={cn('inline-flex h-7 w-fit max-w-full items-center gap-1.5 rounded-full border border-input bg-background pl-2 text-xs text-ink-soft', removable ? 'pr-1' : 'pr-2.5')}>
              <Icon name="description" size={13} />
              <span className="truncate">{`Looking at: ${currentScope}`}</span>
              {removable ? (
                <button type="button" aria-label={`Stop looking at ${currentScope}`} onClick={removeScope}
                  className="grid size-5 shrink-0 place-items-center rounded-full hover:bg-muted hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
                  {closeIcon(12)}
                </button>
              ) : null}
            </span>
          ) : null}
          {/* A log is a polite live region, so each new turn is read out. */}
          <div role="log" aria-label="Messages" className="grid min-w-0 gap-3">
            {ownsThread ? children : (
              <>
                <UserMessage>{"What's the one thing to fix?"}</UserMessage>
                {/* hideName on every reply: the header already says who is answering. */}
                <AiMessage hideName>
                  <p>The September dip. It started the day the new pricing page shipped<Citation source={SOURCE} />.</p>
                </AiMessage>
                {turns.length === 0 ? (
                  <SuggestedPrompts layout="list" label="Follow-ups"
                    suggestions={[{ label: 'Draft a fix for the pricing page' }]}
                    onPick={(prompt) => { setValue(prompt); composerRef.current?.focus() }} />
                ) : null}
                {turns.map((turn) => (
                  <React.Fragment key={turn.id}>
                    <UserMessage>{turn.ask}</UserMessage>
                    {turn.reply === 'working'
                      ? <AiMessage hideName streaming thinking={<AiThinking status="working" activity="Reading the page" />} />
                      : <AiMessage hideName stopped />}
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>
        {hasBody ? <div data-slot="panel-body" className="min-w-0">{body}</div> : null}
      </div>
      <div className="px-3 pt-2 pb-3">
        <PromptComposer
          ref={composerRef}
          size="sm"
          value={value}
          onValueChange={setValue}
          status={working ? 'working' : 'idle'}
          onStop={() => {
            if (ownsThread) onStop?.()
            else setTurns((all) => all.map((turn, index) => (index === all.length - 1 ? { ...turn, reply: 'stopped' } : turn)))
            // Stop unmounts as the composer goes idle; without this keyboard focus falls to the page.
            composerRef.current?.focus()
          }}
          onSubmit={(text) => {
            onSubmit(text)
            if (!ownsThread) setTurns((all) => [...all, { id: all.length + 1, ask: text, reply: 'working' }])
            // A value the app controls is the app's to clear.
            if (givenValue === undefined) setOwnValue('')
          }}
          placeholder={currentScope ? 'Ask about this' : 'Ask anything'}
        />
      </div>
    </section>
  )
}

export type AiSidePanelProps = Omit<AiPanelProps, 'close' | 'className' | 'composerRef'> & {
  /** Controlled when passed; leave it out to let the panel keep its own. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** The element that opens the panel, usually a Button. */
  trigger?: React.ReactElement
  side?: 'left' | 'right'
  className?: string
}

/** An AI assistant docked beside the page — a header with History and Close, a removable chip saying what it is looking at, a short thread, and the small composer, on one soft top-to-bottom AI wash. */
export function AiSidePanel({ open, defaultOpen = false, onOpenChange, trigger, side = 'right', title = 'Assistant', className, ...panel }: AiSidePanelProps) {
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  const isOpen = open === undefined ? ownOpen : open
  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }
  const composerRef = React.useRef<HTMLTextAreaElement>(null)
  const sheetRef = React.useRef<HTMLDivElement>(null)
  return (
    <Sheet open={isOpen} onOpenChange={(next) => setOpen(next)}>
      {trigger ? <SheetTrigger render={trigger} /> : null}
      {/* The panel's header holds the one Close, so the Sheet's corner button is off. gap-0 and p-0 hand the whole
          sheet to the panel, so its wash runs edge to edge. w-full replaces the stock three-quarter width, so on a
          phone the panel takes the whole screen; from sm up the stock max-w-sm still caps it at the same 24rem.
          People open the assistant to ask it something, so focus starts in the message box, not on the header's first
          button. On a touch screen focus goes to the panel itself, as the Sheet does on its own: focusing a text box
          there would throw the on-screen keyboard over half the panel before anything has been read. The Sheet only
          knows a touch from its own trigger; opened by the app (the open prop) it reports nothing, so the device's
          pointer decides instead. */}
      <SheetContent ref={sheetRef} side={side} showCloseButton={false} aria-label={title}
        initialFocus={(openedBy) => {
          const onTouch = openedBy ? openedBy === 'touch' : onTouchScreen()
          return onTouch ? sheetRef.current : composerRef.current
        }}
        className={cn('gap-0 p-0 data-[side=left]:w-full data-[side=right]:w-full', className)}>
        <SheetElement.Provider value={sheetRef}>
        <AiPanel
          {...panel}
          title={title}
          composerRef={composerRef}
          className="min-h-0 flex-1"
          close={(
            <SheetClose render={<Button type="button" variant="ghost" size="icon-sm" />}>
              {closeIcon()}
              <span className="sr-only">Close</span>
            </SheetClose>
          )}
        />
        </SheetElement.Provider>
      </SheetContent>
    </Sheet>
  )
}
