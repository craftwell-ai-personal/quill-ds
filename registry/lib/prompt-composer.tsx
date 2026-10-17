'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Icon } from '@/components/ui/icon'
import { AiMark } from '@/components/ui/ai-mark'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'

export type ComposerStatus = 'idle' | 'working' | 'disabled' | 'error'

// Safari delivers the word-confirming Enter just after the input pop-up closes; 100ms covers that
// gap and is far shorter than a deliberate second Enter to send.
const IME_SETTLE_MS = 100

// The selected tab flares into the box: at each base corner a small piece draws an inward curve (CURVE, 8px, the size
// of the tab's own top corners) in place of the hard T where the tab's side meets the box's top edge. The curve is a ring the
// edge's 1px thickness, centred on the tab's side and the box's top edge so it continues both without a step,
// coloured from the tab side's colour into the box edge's, with the page showing inside it and the field colour
// outside it (which hides the straight edge and side it replaces). The edge is 1px, not 1.5: Chrome and Firefox
// draw a 1.5px border at 1px, so a 1.5px curve looked thicker than the lines it joins.
// A fixed size, not the large-radius token: apps installed through the CLI never receive that variable.
const CURVE = '0.5rem'
const EDGE_A = 'color-mix(in oklab, var(--ai-from) 55%, var(--ai-text-from))'
const EDGE_REST = (c: string) => `color-mix(in oklab, ${c} 45%, var(--line-control))`
function filletStyle(side: 'left' | 'right', lit: boolean, notebook: boolean): React.CSSProperties {
  const [a, b, c] = lit ? [EDGE_A, 'var(--ai-via)', 'var(--ai-to)'] : [EDGE_REST(EDGE_A), EDGE_REST('var(--ai-via)'), EDGE_REST('var(--ai-to)')]
  // The tabs sit near the start of the box's 115deg gradient; the notebook box has a plain border instead.
  const box = notebook ? (lit ? 'var(--ring)' : 'var(--input)') : `color-mix(in oklab, ${a} 75%, ${b})`
  const tabSide = side === 'left' ? `color-mix(in oklab, ${a} 70%, ${b})` : `color-mix(in oklab, ${c} 70%, ${b})`
  const at = side === 'left' ? '0 0' : '100% 0'
  const ring = side === 'left'
    ? `conic-gradient(from 90deg at ${at}, ${tabSide}, ${box} 90deg)`
    : `conic-gradient(from 180deg at ${at}, ${box}, ${tabSide} 90deg)`
  const size = `calc(${CURVE} + 1px)`
  return {
    position: 'absolute',
    bottom: 0,
    [side]: `calc(-1 * ${size})`,
    width: size,
    height: size,
    pointerEvents: 'none',
    // The ring runs from CURVE to CURVE + 1px; each side softens over half a pixel centred on its edge.
    background: `radial-gradient(circle at ${at}, transparent calc(${CURVE} + 0.75px), var(--background) calc(${CURVE} + 1.25px)), ${ring}`,
    // A mask reads only opacity, so any solid colour works; currentColor keeps raw colours out of shipped code.
    mask: `radial-gradient(circle at ${at}, transparent calc(${CURVE} - 0.25px), currentColor calc(${CURVE} + 0.25px))`,
  }
}

export type ComposerAttachment = { id: string; name: string; meta?: string; kind?: string } // kind: 'PDF', 'CSV'… shown on the thumb
export type ComposerTool = { id: string; label: string }

// ai: the tab shows the AI mark. icon: any other mode's own icon (e.g. a person for Agent); ignored when ai is set.
export type ComposerMode = { value: string; label: string; placeholder?: string; ai?: boolean; icon?: React.ReactNode }
export type ComposerCommand = { value: string; label: string; description?: string; trigger: '/' | '@'; ai?: boolean }

export type PromptComposerProps = {
  onSubmit: (value: string) => void
  onStop?: () => void
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  status?: ComposerStatus
  error?: string
  size?: 'lg' | 'sm'
  label?: string
  placeholder?: string
  onMic?: () => void
  leading?: React.ReactNode
  trailing?: React.ReactNode
  attachments?: ComposerAttachment[]
  onRemoveAttachment?: (id: string) => void
  /** Enables the drop target. */
  onFilesDropped?: (files: File[]) => void
  /** Active AI tools, shown as chips with the mark. */
  tools?: ComposerTool[]
  onRemoveTool?: (id: string) => void
  /** Mode tabs above the box (Ask, Agent…); the selected tab shares the AI edge. */
  modes?: ComposerMode[]
  showModes?: boolean // false hides the tabs without removing the modes; default true
  mode?: string
  onModeChange?: (value: string) => void
  /** Items for the `/` and `@` menu. Picking one inserts `${trigger}${value} ` and calls onCommand. */
  commands?: ComposerCommand[]
  onCommand?: (command: ComposerCommand) => void
  /** `notebook`: ruled page, serif text, the AI gradient as a margin rule, and a word count — for prompts that are writing. */
  variant?: 'default' | 'notebook'
  /** Focus the textbox on mount (an AI home page, a chat that opens on demand). */
  autoFocus?: boolean
  /** The textbox, so a page can focus it (after a starter card fills it, say). */
  ref?: React.Ref<HTMLTextAreaElement>
  className?: string
}

// Controlled use: when you pass `value`, clear it yourself in `onSubmit`; the composer only empties its own state when uncontrolled.
/** The box people type to an AI in — grows with the text, sends on Enter, turns Send into Stop while the AI works, with slots for tools, files and a model picker. */
export function PromptComposer({
  onSubmit, onStop, value, defaultValue = '', onValueChange, status = 'idle', error,
  size = 'lg', label = 'Message', placeholder, onMic, leading, trailing, className,
  attachments, onRemoveAttachment, onFilesDropped, tools, onRemoveTool,
  modes, showModes = true, mode, onModeChange, commands, onCommand, variant = 'default', autoFocus, ref,
}: PromptComposerProps) {
  const [inner, setInner] = React.useState(defaultValue)
  const text = value ?? inner
  const setText = (v: string) => { if (value === undefined) setInner(v); onValueChange?.(v) }
  const working = status === 'working'
  const disabled = status === 'disabled'
  const hasText = text.trim().length > 0
  const notebook = variant === 'notebook'
  const wordCount = hasText ? text.trim().split(/\s+/).length : 0
  const errorId = React.useId()
  const [dragging, setDragging] = React.useState(false)
  const dropTarget = onFilesDropped && !disabled

  const [innerMode, setInnerMode] = React.useState(modes?.[0]?.value)
  const currentMode = mode ?? innerMode
  const activeMode = modes?.find((m) => m.value === currentMode)
  // The selected tab lights with the box; :focus-within cannot reach a sibling, so track focus.
  const [focused, setFocused] = React.useState(false)

  const match = /(^|\s)([/@])([\w-]*)$/.exec(text)
  const trigger = match?.[2] as '/' | '@' | undefined
  const query = match?.[3] ?? ''
  const matches = trigger ? (commands ?? []).filter((c) => c.trigger === trigger && c.value.startsWith(query.toLowerCase())) : []
  const [active, setActive] = React.useState(0)
  // Back to the first option whenever the match changes (reset during render, not in an effect).
  const matchKey = `${trigger ?? ''}|${query}|${matches.map((o) => o.value).join(',')}`
  // Escape closes the menu for this match only; typing changes the key and reopens it. The text is never touched.
  const [dismissedKey, setDismissedKey] = React.useState<string | null>(null)
  const [seenMatchKey, setSeenMatchKey] = React.useState(matchKey)
  if (seenMatchKey !== matchKey) { setSeenMatchKey(matchKey); setActive(0); setDismissedKey(null) }
  const options = dismissedKey === matchKey ? [] : matches
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  // Merge the caller's ref with ours: the menu, Send and pick all need the textbox too.
  const setTextareaRef = React.useCallback((node: HTMLTextAreaElement | null) => {
    textareaRef.current = node
    if (typeof ref === 'function') return ref(node)
    if (ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = node
  }, [ref])
  React.useEffect(() => { if (autoFocus) textareaRef.current?.focus() }, [autoFocus])
  // Clamp: the options can shrink between renders while `active` still points past the end.
  const activeIndex = Math.min(active, options.length - 1)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const menuOpen = options.length > 0
  // cmdk gives the list and every option its own id (it ignores ours), so aria-controls and aria-activedescendant have to follow the option cmdk marks
  // selected. Watch the menu and mirror that id onto the textbox, so a screen reader announces the arrowing.
  React.useEffect(() => {
    const menu = menuRef.current
    const box = textareaRef.current
    if (!menuOpen || !menu || !box) return
    const sync = () => {
      const listId = menu.querySelector('[role="listbox"]')?.id
      if (listId) box.setAttribute('aria-controls', listId)
      const id = menu.querySelector('[role="option"][aria-selected="true"]')?.id
      if (id) box.setAttribute('aria-activedescendant', id)
      else box.removeAttribute('aria-activedescendant')
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(menu, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected'] })
    return () => { observer.disconnect(); box.removeAttribute('aria-activedescendant'); box.removeAttribute('aria-controls') }
  }, [menuOpen])
  // The menu opens upward, over the content above the composer. A composer near the top of the screen, or of a
  // panel that clips its content, has no room there, so the menu flips below it instead of opening out of sight.
  const [menuBelow, setMenuBelow] = React.useState(false)
  React.useLayoutEffect(() => {
    const menu = menuRef.current
    const anchor = menu?.parentElement
    if (!menuOpen || !menu || !anchor) return
    // The visible area is the window, cut down by the nearest ancestor that clips (a scrolling side panel, say).
    let areaTop = 0
    let areaBottom = window.innerHeight
    for (let el = anchor.parentElement; el && el !== document.body; el = el.parentElement) {
      if (getComputedStyle(el).overflowY === 'visible') continue
      const r = el.getBoundingClientRect()
      areaTop = Math.max(areaTop, r.top)
      areaBottom = Math.min(areaBottom, r.bottom)
      break
    }
    const { top, bottom } = anchor.getBoundingClientRect()
    const spaceAbove = top - areaTop
    const spaceBelow = areaBottom - bottom
    setMenuBelow(spaceAbove < menu.offsetHeight + 8 && spaceBelow > spaceAbove)
  }, [menuOpen, options.length])
  const pick = (c: ComposerCommand) => {
    setText(text.slice(0, text.length - query.length - 1) + `${c.trigger}${c.value} `)
    onCommand?.(c)
    textareaRef.current?.focus()
  }

  // Japanese and Chinese input open a pop-up of candidate words, and Enter confirms the chosen
  // word. That Enter must never send or pick a command. Browsers mark it differently — Chrome
  // sends it while the pop-up is open (isComposing), Safari just after the pop-up closes (keyCode
  // 229, isComposing false) — so the composer also tracks the pop-up itself and treats an Enter
  // within IME_SETTLE_MS of it closing as part of confirming the word.
  const composingRef = React.useRef(false)
  const compositionEndedAt = React.useRef(Number.NEGATIVE_INFINITY)
  const isConfirmingWord = (e: React.KeyboardEvent) =>
    e.nativeEvent.isComposing ||
    e.nativeEvent.keyCode === 229 ||
    composingRef.current ||
    e.timeStamp - compositionEndedAt.current < IME_SETTLE_MS

  const submit = () => {
    if (!hasText || working || disabled) return
    onSubmit(text)
    if (value === undefined) setInner('')
    // Clicking Send disables it (the box is now empty), which would drop focus to the page.
    textareaRef.current?.focus()
  }

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="relative">
        {options.length ? (
          <Command ref={menuRef} className={cn('absolute inset-x-0 z-20 h-auto rounded-xl border border-border shadow-lg', menuBelow ? 'top-full mt-2' : 'bottom-full mb-2')} data-side={menuBelow ? 'bottom' : 'top'} shouldFilter={false}
            value={options[activeIndex]?.value} onMouseDown={(e) => e.preventDefault()} onValueChange={(v) => setActive(Math.max(0, options.findIndex((o) => o.value === v)))}>
            <CommandList>
              <CommandEmpty>No matches</CommandEmpty>
              <CommandGroup heading={trigger === '/' ? 'Commands' : 'Add context'}>
                {options.map((c) => (
                  <CommandItem key={c.value} value={c.value} onSelect={() => pick(c)} className="gap-2.5">
                    {/* An empty slot the mark's width (the item draws every svg at 16px) keeps labels on one edge when only some commands carry it. */}
                    {c.ai ? <AiMark size={18} /> : options.some((o) => o.ai) ? <span aria-hidden className="size-4 shrink-0" /> : null}
                    <span className="grid"><span>{c.label}</span>{c.description ? <span className="text-xs text-muted-foreground">{c.description}</span> : null}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : null}
        {showModes && modes?.length ? (
          // pl-6 (24px) = the box's 16px corner + the tab's 8px base curve, so the curve meets the box's straight edge.
          <div role="tablist" aria-label="Mode" className="relative z-10 -mb-px flex gap-0.5 pl-6">
            {modes.map((m) => {
              const selected = m.value === currentMode
              return (
                <button
                  key={m.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-lit={selected && focused ? '' : undefined}
                  onClick={() => { if (mode === undefined) setInnerMode(m.value); onModeChange?.(m.value) }}
                  // ai-edge's border shorthand outranks a border-b-0 class, which left a thin gradient bottom border
                  // whose ends poked out past the tab's base; an inline width always wins.
                  style={selected ? { borderBottomWidth: 0 } : undefined}
                  className={cn(
                    // Without outline-hidden a keyboard-focused tab drew the browser's own focus ring, not Quill's. Inset, so the
                    // ring stays inside the tab and does not lay a bar across the box edge the tab joins.
                    'relative inline-flex items-center gap-1.5 rounded-t-lg px-3.5 pt-1.5 pb-2 text-sm font-semibold outline-hidden focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50',
                    // The selected tab shares the AI edge; the after: strip covers the box's top
                    // edge under it so tab and box read as one shape (approved 2026-10-02). z-10 keeps its
                    // base curves above a neighbouring tab, which would otherwise paint over the right one.
                    selected
                      ? 'z-10 ai-edge text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-background'
                      // Unselected tabs keep a subtle muted fill and a hairline outline so they still
                      // read as tabs (the fill alone vanishes on the dark themes), and stop 1px short
                      // so the box's gradient edge runs in front of them; only the selected tab joins the box.
                      : 'mb-px border border-b-0 border-border bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {selected ? (
                    <>
                      <span aria-hidden data-slot="tab-fillet" style={filletStyle('left', focused, notebook)} />
                      <span aria-hidden data-slot="tab-fillet" style={filletStyle('right', focused, notebook)} />
                    </>
                  ) : null}
                  {m.ai ? <AiMark size={18} /> : m.icon ? <span aria-hidden className="inline-grid size-4.5 place-items-center [&>svg]:size-4.5">{m.icon}</span> : null}
                  {m.label}
                </button>
              )
            })}
          </div>
        ) : null}
        <div
          data-slot="prompt-composer"
          data-size={size}
          onDragOver={dropTarget ? (e) => { e.preventDefault(); setDragging(true) } : undefined}
          // dragleave also fires when the pointer moves onto a child (the textarea, the hint); only leaving the box ends the drag.
          onDragLeave={dropTarget ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false) } : undefined}
          onDrop={dropTarget ? (e) => { e.preventDefault(); setDragging(false); onFilesDropped([...e.dataTransfer.files]) } : undefined}
          className={cn(
            'shadow-md',
            notebook
              // The margin rule and border replace the AI edge; focus-within stands in for the textarea's cancelled ring.
              ? 'relative overflow-hidden rounded-l-sm rounded-r-xl border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40'
              : cn('rounded-xl', working ? 'ai-edge-working' : 'ai-edge'),
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          {notebook ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[linear-gradient(180deg,var(--ai-from),var(--ai-via),var(--ai-to))]" /> : null}
          {/* The edge animation is off in notebook mode, so a sweeping top line carries the working cue. */}
          {notebook && working ? <span aria-hidden className="ai-line absolute inset-x-0 top-0" /> : null}
          {attachments?.length ? (
            <ul className={cn('flex flex-wrap gap-2', size === 'lg' ? 'px-3.5 pt-3' : 'px-2.5 pt-2')} aria-label="Attached files">
              {attachments.map((a) => (
                <li key={a.id} className="relative flex max-w-chip-lg items-center gap-2 rounded-lg border border-border bg-card py-1.5 pr-8 pl-1.5 text-xs">
                  {a.kind ? <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-2xs font-semibold text-ink-soft">{a.kind}</span> : null}
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-foreground">{a.name}</span>
                    {a.meta ? <span className="block text-muted-foreground">{a.meta}</span> : null}
                  </span>
                  {onRemoveAttachment ? (
                    <button type="button" aria-label={`Remove ${a.name}`} onClick={() => onRemoveAttachment(a.id)}
                      className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
                      <Icon name="close" className="size-3.5" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {dragging && dropTarget ? <p className="mx-3.5 mt-2 rounded-lg border border-dashed border-input p-2 text-center text-xs text-muted-foreground">Drop files to attach</p> : null}
          <Textarea
            aria-label={label}
            aria-invalid={status === 'error' || undefined}
            aria-describedby={status === 'error' && error ? errorId : undefined}
            disabled={disabled}
            placeholder={activeMode?.placeholder ?? placeholder}
            ref={setTextareaRef}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={(e) => { composingRef.current = false; compositionEndedAt.current = e.timeStamp }}
            onKeyDown={(e) => {
              // The menu goes first so Enter picks a command instead of sending. It honours the same IME guard.
              if (options.length) {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % options.length); return }
                if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i - 1 + options.length) % options.length); return }
                if (e.key === 'Enter') {
                  if (isConfirmingWord(e)) return
                  e.preventDefault(); pick(options[activeIndex]); return
                }
                if (e.key === 'Escape') { e.preventDefault(); setDismissedKey(matchKey); return }
              }
              if (e.key === 'Enter' && !e.shiftKey && !isConfirmingWord(e)) {
                e.preventDefault()
                submit()
              }
            }}
            className={cn(
              // aria-invalid:* cancel the stock textarea's red ring; the AI edge and the alert carry the error. disabled:* cancel
              // the stock grey fill and fade, which covered only the text area; the whole box fades as one instead.
              'max-h-area resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 disabled:bg-transparent disabled:opacity-100 dark:disabled:bg-transparent aria-invalid:border-transparent aria-invalid:ring-0 dark:bg-transparent dark:aria-invalid:border-transparent dark:aria-invalid:ring-0',
              // md:text-* overrides the stock textarea's md:text-sm, which would shrink lg on desktop.
              notebook
                ? // The rules live on the textarea so they scroll with the text (bg-local) and follow its padding. Each 32px line (leading-8) starts
                // at the top padding (pt-3.5 = 14px) and its rule is the line's last pixel, so the background y offset must equal that padding.
                'font-heading text-lg leading-8 md:text-lg pt-3.5 pl-6 placeholder:italic bg-local bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,var(--line-soft)_31px,var(--line-soft)_32px)] bg-[position:0_14px]'
                : size === 'lg' ? 'min-h-16 px-4 pt-3.5 text-base md:text-base' : 'min-h-touch px-3 pt-2.5 text-sm md:text-sm',
            )}
          />
          <div className={cn('flex items-center gap-1.5', size === 'lg' ? 'px-2.5 pb-2.5' : 'px-1.5 pb-1.5')}>
            {leading}
            {tools?.map((t) => (
              <span key={t.id} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pr-1 pl-2 text-xs font-semibold text-foreground">
                <AiMark size={13} />
                {t.label}
                {onRemoveTool ? (
                  <button type="button" aria-label={`Turn off ${t.label}`} onClick={() => onRemoveTool(t.id)}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
                    <Icon name="close" className="size-3" />
                  </button>
                ) : null}
              </span>
            ))}
            <span className="flex-1" />
            {trailing}
            {notebook ? (
              // Plain text, not a live region: announcing every word as it is typed is noise.
              <span className="text-xs text-muted-foreground tabular-nums">
                {wordCount === 1 ? '1 word' : `${wordCount} words`}
              </span>
            ) : null}
            {working ? (
              <Button type="button" size="icon" className="rounded-full" aria-label="Stop" onClick={onStop}>
                <Icon name="stop" className="size-4" />
              </Button>
            ) : !hasText && onMic ? (
              <Button type="button" size="icon" variant="ghost" className="rounded-full" aria-label="Dictate" onClick={onMic} disabled={disabled}>
                <Icon name="mic" className="size-5" />
              </Button>
            ) : (
              <Button type="button" size="icon" className="rounded-full" aria-label="Send" onClick={submit} disabled={!hasText || disabled}>
                <Icon name="arrow_upward" className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      {status === 'error' && error ? (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 px-1 text-sm text-destructive">
          <Icon name="error" size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
