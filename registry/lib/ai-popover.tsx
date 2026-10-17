'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { AiMark } from '@/components/ui/ai-mark'
import { cn } from '@/lib/utils'

/** Anything that can say where it is on screen: a DOM Range, an element, or an object of your own with getBoundingClientRect. */
export type AiPopoverAnchor = { getBoundingClientRect: () => DOMRect }

export type AiPopoverProps = {
  /** The text or control the suggestion is about: a <mark> around the selected text, or a Button. The popover opens from it and sits beside it. Optional once `anchor` is passed. */
  children?: React.ReactElement
  /** What the popover sits beside when there is no element to wrap: the selection in an editor (a Range), or for a <textarea> an object whose getBoundingClientRect returns the box you worked out. Nothing is pressed to open it, so drive `open` yourself. With `children` as well, children still opens it and `anchor` only says where it sits. Its box is asked for on every frame while the popover is open, to follow the text as it moves: keep getBoundingClientRect cheap. Render the popover just after the editor: Tab past its last button closes it and goes to the next Tab stop after where it is rendered. An anchor inside a scaled ancestor is followed at its size on screen. Not supported: a rotated, skewed or mirrored ancestor (the popover then sits near the anchor, not on it), and an anchor with no size inside a scaled ancestor (it is placed approximately). */
  anchor?: AiPopoverAnchor | null
  /** With `anchor`: where the cursor goes when the popover closes (the editor). Left out, it goes back to `children`, or to whatever had it when the popover opened. */
  returnFocus?: React.RefObject<HTMLElement | null>
  /** What the AI did: "Rewrite: shorter". */
  title: string
  /** The suggested text. Leave it out while the AI is still writing. */
  suggestion?: React.ReactNode
  /** The AI is writing: shows the shimmering label and switches off Replace, Insert below and Try again. */
  working?: boolean
  workingLabel?: string
  /** Controlled when passed; leave it out to let the popover keep its own. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onReplace: () => void
  replaceLabel?: string
  /** Shows "Insert below". */
  onInsertBelow?: () => void
  /** Shows "Try again". */
  onRetry?: () => void
  /** Called when Discard is pressed (not on Escape or an outside press). */
  onDiscard?: () => void
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
}

// '', whitespace, null and false are all "no suggestion yet".
const isShown = (node: React.ReactNode) =>
  node !== undefined && node !== null && node !== false && !(typeof node === 'string' && node.trim() === '')

// Mounts with the popover, so its "just after mount" is just after the popover opens. The region is in the popover
// from its first paint, empty: a live region that arrives already filled is announced unreliably.
function WritingStatus({ working, label }: { working: boolean; label: string }) {
  const [announcing, setAnnouncing] = React.useState(false)
  React.useEffect(() => {
    const timer = window.setTimeout(() => setAnnouncing(true), 100)
    return () => window.clearTimeout(timer)
  }, [])
  // "Suggestion ready" is only news if the person waited for it in this popover.
  const [wasWorking, setWasWorking] = React.useState(working)
  if (working && !wasWorking) setWasWorking(true)
  return <div role="status" className="sr-only">{!announcing ? '' : working ? label : wasWorking ? 'Suggestion ready' : ''}</div>
}

// The first of these that is still on the page and can take the cursor.
const firstOnPage = (...candidates: Array<HTMLElement | null | undefined>) =>
  candidates.find((element) => element && element.isConnected && element !== document.body) ?? null

type Box = { left: number; top: number; width: number; height: number }
const sameBox = (one: Box, other: Box) =>
  Math.abs(one.left - other.left) < 0.05 && Math.abs(one.top - other.top) < 0.05 && Math.abs(one.width - other.width) < 0.05 && Math.abs(one.height - other.height) < 0.05

const write = (spot: HTMLElement, css: { x: number; y: number; width: number; height: number }) => {
  spot.style.left = `${css.x}px`
  spot.style.top = `${css.y}px`
  spot.style.width = `${css.width}px`
  spot.style.height = `${css.height}px`
}

// A stand-in that is still off its anchor after this many writes is not going to get there (two is the most a
// supported case takes).
const MAX_WRITES = 6

// What Tab can land on: links, enabled form controls and buttons, and anything given a place in the Tab order.
const TAB_STOPS = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

// Anchor mode. The stock PopoverContent places the popover beside its trigger and takes no other anchor, so the
// selection gets a stand-in: an empty box kept exactly over it, which is the popover's trigger in name only. It takes
// no presses (they reach the text underneath), is not a Tab stop and is hidden from screen readers.
function AnchorSpot({ id, anchor, open, onFocus }: { id: string; anchor: AiPopoverAnchor; open: boolean; onFocus: () => void }) {
  // Typed as the stock trigger types it; the element is the <span> below.
  const ref = React.useRef<HTMLButtonElement>(null)
  // What was last written to the stand-in, in its own CSS pixels, and how many screen pixels one of those is.
  const written = React.useRef({ x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 })
  // The last box the anchor gave that was a real one: its numbers (an app may hand out one rect and write over it),
  // and the anchor they came from (a new anchor that cannot be measured is not put at the old one's place: the
  // stand-in simply stays where it last was).
  const lastGood = React.useRef<{ from: AiPopoverAnchor; box: Box } | null>(null)
  // The box last aimed at: how far off the stand-in was then, the scale that write went by, and how many writes it
  // has had. And the box given up on. Correcting only goes on while it helps; where it cannot (see below) the
  // stand-in is left alone until the anchor moves.
  const aim = React.useRef<{ box: Box; miss: number; scaleX: number; scaleY: number; writes: number; best: { miss: number; x: number; y: number; width: number; height: number } } | null>(null)
  const gaveUpOn = React.useRef<Box | null>(null)
  const reported = React.useRef(false)
  const place = React.useCallback(() => {
    const spot = ref.current
    if (!spot) return
    // An app's own getBoundingClientRect can throw, and a Range whose text was redrawn reports an empty box at the
    // window's corner. Neither is a place to go to: the last real box is kept.
    if (lastGood.current?.from !== anchor) lastGood.current = null
    try {
      const box = anchor.getBoundingClientRect()
      if (box.width !== 0 || box.height !== 0 || box.left !== 0 || box.top !== 0) {
        lastGood.current = { from: anchor, box: { left: box.left, top: box.top, width: box.width, height: box.height } }
      }
    } catch (error) {
      // Dev-only, once for each popover: in production the popover staying put is the right failure for an app's
      // users, and saying nothing is the wrong one for its developers.
      if (process.env.NODE_ENV !== 'production' && !reported.current) {
        reported.current = true
        console.error(
          '[quill] <AiPopover anchor> threw from getBoundingClientRect, so the popover stays where it last was. ' +
            'Return a box, or pass anchor={null} while there is nothing to sit beside.',
          error
        )
      }
    }
    const want = lastGood.current?.box
    if (!want) return
    if (gaveUpOn.current && sameBox(gaveUpOn.current, want)) return
    gaveUpOn.current = null
    const css = written.current
    // Twice at most: the first pass may only learn the scale (nothing had a size yet to measure it by).
    for (let pass = 0; pass < 2; pass += 1) {
      const landed = spot.getBoundingClientRect()
      const off = [want.left - landed.left, want.top - landed.top, want.width - landed.width, want.height - landed.height]
      const miss = Math.max(...off.map(Math.abs))
      // Already there (the usual answer): nothing is written, so nothing is laid out again.
      if (miss < 0.05) {
        aim.current = null
        return
      }
      // A fixed box is measured from the window, unless an ancestor is transformed: then from that ancestor, and in
      // its pixels. Under scale(2) one CSS pixel is two on screen, so the miss (read in screen pixels) is divided by
      // the scale before it is taken out, and so is the size. The scale is what the box measures over what was
      // written.
      if (css.width > 0 && landed.width > 0) css.scaleX = landed.width / css.width
      if (css.height > 0 && landed.height > 0) css.scaleY = landed.height / css.height
      // One axis with nothing to measure (a caret has no width) goes by the other.
      const scaleX = css.width > 0 ? css.scaleX : css.scaleY
      const scaleY = css.height > 0 ? css.scaleY : css.scaleX
      // Aimed at this same box before. If the last write brought it no nearer and there is nothing new to go by (the
      // same scale as then), or it has been written MAX_WRITES times and is still off, correcting is not working,
      // and more of it would only keep the stand-in moving (or send it off the screen). It stays where it is. This
      // is what happens inside a rotated, skewed or mirrored ancestor, where an upright box cannot be laid over the
      // anchor, and for an anchor with no size inside a scaled one, where there is nothing to tell the scale by.
      const before = aim.current && sameBox(aim.current.box, want) ? aim.current : null
      const nothingNew = before !== null && Math.abs(before.scaleX - scaleX) < 0.001 && Math.abs(before.scaleY - scaleY) < 0.001
      if (before && ((nothingNew && miss >= before.miss - 0.01) || before.writes >= MAX_WRITES)) {
        // Left at the nearest it got, which may be where it started: a mirrored ancestor sends each correction the
        // wrong way, and the last one written would be the farthest off.
        if (before.best.miss < miss - 0.01) write(spot, Object.assign(css, { x: before.best.x, y: before.best.y, width: before.best.width, height: before.best.height }))
        gaveUpOn.current = want
        aim.current = null
        return
      }
      const best = before && before.best.miss <= miss ? before.best : { miss, x: css.x, y: css.y, width: css.width, height: css.height }
      const next = { x: css.x + off[0] / scaleX, y: css.y + off[1] / scaleY, width: want.width / scaleX, height: want.height / scaleY }
      // Never a value that is not a number: what was written is forgotten, and the stand-in stays as it is.
      if (!Object.values(next).every(Number.isFinite)) {
        written.current = { x: 0, y: 0, width: 0, height: 0, scaleX: 1, scaleY: 1 }
        gaveUpOn.current = want
        aim.current = null
        return
      }
      aim.current = { box: want, miss, scaleX, scaleY, writes: (before?.writes ?? 0) + 1, best }
      write(spot, Object.assign(css, next))
    }
  }, [anchor])
  // After every render while open (the anchor may be a new one), and before the popover works out its own place.
  React.useLayoutEffect(() => {
    if (open) place()
  })
  // Then on every frame while open. A selection moves when its box scrolls, when the window is resized and when the
  // page around it changes height, and only the first two say so; asking each frame catches all three. The stock
  // positioner notices the stand-in move and follows.
  React.useEffect(() => {
    if (!open) return
    let frame = window.requestAnimationFrame(function follow() {
      place()
      frame = window.requestAnimationFrame(follow)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, place])
  return <PopoverTrigger ref={ref} id={id} nativeButton={false} tabIndex={-1} aria-hidden onFocus={onFocus} render={<span data-slot="popover-anchor" className="pointer-events-none fixed top-0 left-0" />} />
}

/** An AI suggestion beside the text it is about — what the AI did, the suggested text on a soft AI wash, then Discard, Try again and Replace. */
export function AiPopover({
  children, title, suggestion, working = false, workingLabel = 'Writing',
  open, defaultOpen = false, onOpenChange, onReplace, replaceLabel = 'Replace',
  onInsertBelow, onRetry, onDiscard, side = 'bottom', align = 'start', className, anchor, returnFocus,
}: AiPopoverProps) {
  const [ownOpen, setOwnOpen] = React.useState(defaultOpen)
  // With neither a trigger nor an anchor there is nothing to sit beside, so nothing is shown.
  const anchored = anchor !== undefined && anchor !== null
  const isOpen = (open === undefined ? ownOpen : open) && (anchored || children !== undefined)
  const setOpen = (next: boolean) => {
    if (open === undefined) setOwnOpen(next)
    onOpenChange?.(next)
  }
  const popupRef = React.useRef<HTMLDivElement>(null)
  const ready = !working && isShown(suggestion)
  // The middle of the popover scrolls when the suggestion is taller than the space left on screen. It holds nothing
  // a keyboard can land on, so while it overflows (and only then) it is a Tab stop itself; some browsers do not make
  // a scroller focusable on their own. The overflow is measured, and remembered against the element it was measured
  // on, so a popover that opens again starts as "fits" instead of with the last one's answer.
  const [scrollArea, setScrollArea] = React.useState<HTMLDivElement | null>(null)
  const [overflowing, setOverflowing] = React.useState<HTMLDivElement | null>(null)
  const scrolls = scrollArea !== null && overflowing === scrollArea
  React.useEffect(() => {
    if (!scrollArea || typeof ResizeObserver === 'undefined') return
    // Fires once on observe, then whenever the area (the window changed) or what is in it (the suggestion changed) resizes.
    const observer = new ResizeObserver(() => {
      const overflows = scrollArea.scrollHeight > scrollArea.clientHeight
      // The area is about to stop being focusable; keep a keyboard user inside the popover rather than on the page.
      if (!overflows && document.activeElement === scrollArea) popupRef.current?.focus()
      setOverflowing(overflows ? scrollArea : null)
    })
    observer.observe(scrollArea)
    for (const child of Array.from(scrollArea.children)) observer.observe(child)
    return () => observer.disconnect()
    // working and ready swap the area's children, which have to be observed afresh.
  }, [scrollArea, working, ready])
  // A Button or a <button> is a native button. Highlighted text (a <mark>, a <span>) is not, and the trigger has to
  // be told so it adds the button role, a Tab stop and Enter / Space.
  const nativeButton = children === undefined || typeof children.type !== 'string' || children.type === 'button'
  // Anchor mode: the stand-in is the trigger the popover is placed by, and must never end up holding the cursor.
  // Closing sends the cursor to returnFocus, else to the trigger (children), else to what had it on opening.
  const spotId = React.useId()
  const popupId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const opener = React.useRef<HTMLElement | null>(null)

  return (
    // triggerId says which trigger the popover is placed by: the stand-in while there is an anchor; null leaves it to
    // the popover, which goes by the trigger that was pressed.
    <Popover open={isOpen} triggerId={anchored ? spotId : null}
      onOpenChange={(next, details) => {
        // Placed by the stand-in, the popover takes a press on the real trigger while open as a request to move to
        // it, not to close. A second press on the trigger closes, as it does without an anchor.
        if (anchored && next && isOpen && details.reason === 'trigger-press') return setOpen(false)
        setOpen(next)
      }}>
      {/* The stand-in is the trigger the popover belongs to, so the real one is told here what a trigger is told:
          whether the popover is open and which it is. Tab from it, while open, goes in to the popover's first stop,
          as it does from a trigger the popover is placed by. */}
      {children ? (
        // Highlighted text gets a Tab stop here, so it needs Quill's focus ring, not the browser's.
        <PopoverTrigger render={children} nativeButton={nativeButton} className={nativeButton ? undefined : 'outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50'} {...(anchored ? {
          ref: triggerRef,
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? popupId : undefined,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (!isOpen || event.key !== 'Tab' || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return
            const first = popupRef.current?.querySelector<HTMLElement>(TAB_STOPS)
            if (!first) return
            event.preventDefault()
            first.focus()
          },
        } : undefined)} />
      ) : null}
      {/* Shift+Tab out of the popover's start goes to its trigger. Here that is the stand-in, so it passes the cursor
          on: to the real trigger when there is one, as a wrapped anchor would have it; with no trigger there is
          nothing to step back to, and the cursor stays in the popover, on the dialog. */}
      {anchored ? <AnchorSpot id={spotId} anchor={anchor} open={isOpen} onFocus={() => (firstOnPage(triggerRef.current) ?? popupRef.current)?.focus()} /> : null}
      {/* The wash is a background image over the popover's own fill, so the stock surface colour stays. Focus opens on
          the dialog itself, not on Discard: someone holding Enter to open it would otherwise discard on the key repeat. */}
      <PopoverContent ref={popupRef} side={side} align={align}
        // With an anchor, what has the cursor as the popover opens is remembered, to hand it back on closing.
        // Asked a second time with the cursor already inside (a double render), the first answer stands.
        initialFocus={anchored ? () => {
          const active = document.activeElement
          if (!popupRef.current?.contains(active)) opener.current = active instanceof HTMLElement ? active : null
          return popupRef.current
        } : popupRef}
        {...(anchored ? { id: popupId } : undefined)}
        finalFocus={anchored ? () => firstOnPage(returnFocus?.current, triggerRef.current, opener.current) ?? false : undefined}
        className={cn('ai-wash w-card max-w-[calc(100vw-2rem)] max-h-(--available-height) gap-0 overflow-hidden p-0 focus-visible:ring-3 focus-visible:ring-ring/50', className)}>
        <div className="flex shrink-0 items-center gap-2 px-3.5 pt-3 pb-1">
          <AiMark size={18} />
          {/* A paragraph, not the default h2: headings take the serif display preset. */}
          <PopoverTitle render={<p />} className="min-w-0 flex-1 text-sm font-semibold text-foreground">{title}</PopoverTitle>
        </div>
        {/* The popup is capped to the space the positioner has left. The header and the buttons stay put; only this
            middle part scrolls, so Replace is never pushed off a short screen. While it overflows it is a named Tab
            stop, so the arrow and Page keys scroll it. Its ring is an outline drawn just inside it: the popover clips
            anything outside, and an outline is painted over the text scrolling past. */}
        <div ref={setScrollArea} data-focus-inset="" {...(scrolls ? { tabIndex: 0, role: 'group', 'aria-label': 'Suggested text' } : {})}
          className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-2.5 overflow-y-auto px-3.5 pt-1.5 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring/50">
          <WritingStatus working={working} label={workingLabel} />
          {working ? (
            <div className="grid gap-1.5">
              <span aria-hidden data-slot="writing-label" className="ai-shimmer w-fit text-sm font-semibold">{workingLabel}</span>
              <span aria-hidden className="ai-line" />
            </div>
          ) : ready ? (
            // The divider line, not the control line: the tile is read-only content, told apart from the popover by
            // its fill. The control line is kept for things people press or type in.
            <div data-slot="suggestion" className="rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] text-foreground">{suggestion}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-3.5 pt-2.5 pb-3.5">
          <Button type="button" variant="ghost" onClick={() => { onDiscard?.(); setOpen(false) }}>Discard</Button>
          <span className="flex-1" />
          {/* Pressing Try again disables it while the AI writes, and the suggestion is swapped for the shimmer; focus
              moves to the dialog first so it never falls to the page. */}
          {onRetry ? <Button type="button" variant="outline" disabled={working} onClick={() => { popupRef.current?.focus(); onRetry() }}>Try again</Button> : null}
          {onInsertBelow ? <Button type="button" variant="outline" disabled={!ready} onClick={() => { onInsertBelow(); setOpen(false) }}>Insert below</Button> : null}
          {/* Plain solid ink: accepting an AI suggestion is an ordinary decision. */}
          <Button type="button" disabled={!ready} onClick={() => { onReplace(); setOpen(false) }}>{replaceLabel}</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
