import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test'
import { AiPanel, AiSidePanel } from '@registry/blocks/ai-side-panel'
import { AiButton } from '@/components/ui/ai-button'
import { Button } from '@/components/ui/button'
import { ApprovalCard } from '@/components/ui/approval-card'
import { AgentSteps } from '@/components/ui/agent-steps'
import { AiMessage, UserMessage } from '@/components/ui/ai-message'
import { AiThinking } from '@/components/ui/ai-thinking'
import { ConversationHistory, type Conversation } from '@registry/blocks/conversation-history'
import { usage } from '@/usage/ai-side-panel.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { compositeOver, contrastRatio, surfaceBehind, washedTop } from '../contrast'
import { expectFocusRing, tabTo } from '../focus-ring'

// In the canvas the panel gives way to a window shorter than itself, keeping the wrapper's 24px margin (3rem both sides);
// on the Docs page the window is the whole long page, so it keeps its full height.
const fitHeight = (viewMode: string, docs: string, canvas: string) => (viewMode === 'docs' ? docs : canvas)

const meta = {
  title: 'Patterns / AI / AI Side Panel',
  component: AiSidePanel,
  tags: ['autodocs'],
  // Centred by the theme wrapper in .storybook/preview.tsx, not by Storybook's own `layout: 'centered'`: that is a
  // class on the preview page, which the test runner's page does not have, so the guard tests below could not see it.
  // The panel stays the wrapper's only element, which is what Paper draws and paper:check screenshots.
  parameters: { layout: 'fullscreen', quillCentered: true, docs: { description: { component: renderUsageDocs(usage) } } },
  args: { onSubmit: fn(), onHistory: fn(), onScopeRemove: fn(), onOpenChange: fn() },
  afterEach: async ({ canvasElement, viewMode }) => {
    // The Docs page runs this hook too, but there the window is the whole long page and the example's box is its preview.
    if (viewMode === 'docs') return
    const target = canvasElement.querySelector<HTMLElement>('section.ai-wash') ?? canvasElement.querySelector<HTMLElement>('button')
    await expect(target).not.toBeNull()
    await expectCentredWithMargin(target as HTMLElement)
  },
  // The panel drawn inline, as one root element: this is what the docs page and Paper show. The Sheet itself is the InASheet story.
  render: (args, { viewMode }) => (
    <AiPanel title={args.title} scope={args.scope} onSubmit={args.onSubmit} onHistory={args.onHistory} onScopeRemove={args.onScopeRemove}
      className={`${fitHeight(viewMode, 'h-[35rem]', 'h-[min(35rem,calc(100dvh-3rem))]')} w-full max-w-sm rounded-xl border border-border shadow-md`} />
  ),
} satisfies Meta<typeof AiSidePanel>

export default meta
type Story = StoryObj<typeof meta>

// The test runner sizes its page from these (addon-vitest reads the viewport global).
const VIEWPORTS = {
  desktop: { name: 'Desktop 1024', styles: { width: '1024px', height: '800px' }, type: 'desktop' },
  short: { name: 'Short 900x480', styles: { width: '900px', height: '480px' }, type: 'desktop' },
  phone: { name: 'Phone 375', styles: { width: '375px', height: '812px' }, type: 'mobile' },
} as const
// Every example sits dead centre on both axes with an even margin on all four sides, and never past the window:
// a framing change that parks it in a corner, lets a fixed height hang past the bottom, or crowds an edge fails here.
// Run after every story's own play (meta `afterEach`), so the end state is what is measured, not the first paint.
const expectCentredWithMargin = async (element: HTMLElement) => {
  const box = element.getBoundingClientRect()
  const pageWidth = document.documentElement.clientWidth
  const margins = { left: box.left, right: pageWidth - box.right, top: box.top, bottom: window.innerHeight - box.bottom }
  await expect(Math.abs(margins.left - margins.right)).toBeLessThanOrEqual(0.5)
  await expect(Math.abs(margins.top - margins.bottom)).toBeLessThanOrEqual(0.5)
  for (const margin of Object.values(margins)) await expect(margin).toBeGreaterThanOrEqual(16)
}

// The thread's scrolling element. Messages scrolled under the header fade out through a mask, which only exists
// while something is scrolled above: 'none' at the very top, a gradient as soon as the thread has moved.
const threadOf = (root: HTMLElement) => root.querySelector('[data-slot="thread"]') as HTMLElement
const fadeOf = (thread: HTMLElement) => getComputedStyle(thread).maskImage

// Every "Assistant" a sighted person can see. A name kept for screen readers only is a 1px clipped box.
const visibleNames = (root: HTMLElement, name = 'Assistant') =>
  within(root).queryAllByText(name).filter((element) => {
    const box = (element.closest('[data-slot="reply-name"]') ?? element).getBoundingClientRect()
    return box.width > 1 && box.height > 1
  })
// A reply's avatar and the first row beside it share one centre line, measured from the first line's own glyph box.
const expectLevelWithAvatar = async (firstRow: Element) => {
  const avatar = (firstRow.closest('article')?.querySelector('[data-slot="reply-avatar"]') as HTMLElement).getBoundingClientRect()
  // The first text node, not the element: a range around a whole paragraph reports the paragraph's box.
  const range = document.createRange()
  range.selectNodeContents(document.createTreeWalker(firstRow, NodeFilter.SHOW_TEXT).nextNode() as Text)
  const line = range.getClientRects()[0]
  await expect(Math.abs((line.top + line.bottom) / 2 - (avatar.top + avatar.bottom) / 2)).toBeLessThanOrEqual(1)
}

const DESKTOP = { parameters: { viewport: { options: VIEWPORTS } }, globals: { viewport: { value: 'desktop', isRotated: false } } } as const

// Read-only on purpose: this is the story Paper draws and compares with.
export const Default: Story = {
  ...DESKTOP,
  play: async ({ canvas }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    await expect(within(panel).getByText('Looking at: Q3 report')).toBeVisible()
    const log = within(panel).getByRole('log', { name: 'Messages' })
    await expect(log).toHaveTextContent('The September dip.')
    await expect(within(log).getByRole('button', { name: 'changelog, source: Changelog: new pricing page' })).toBeVisible()
    await expect(within(log).getByRole('list', { name: 'Follow-ups' })).toHaveAttribute('data-layout', 'list')
    await expect(within(panel).getByRole('textbox', { name: 'Message' })).toBeVisible()
    await expect(within(panel).getByRole('button', { name: 'History' })).toBeVisible()
    // Inline there is nothing to close.
    await expect(within(panel).queryByRole('button', { name: 'Close' })).toBeNull()
    // One wash, on the panel itself, top to bottom: no part paints a band or a fill of its own over it.
    await expect(getComputedStyle(panel).backgroundImage).toContain('gradient')
    for (const part of Array.from(panel.children)) {
      await expect(getComputedStyle(part).backgroundImage).toBe('none')
      await expect(getComputedStyle(part).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    }
    // The header says "Assistant" once; the reply does not repeat it, but still carries it for screen readers.
    await expect(visibleNames(log)).toHaveLength(0)
    await expect(visibleNames(panel)).toEqual([within(panel).getByText('Assistant', { selector: 'p[id]' })])
    await expect(within(log).getByText('Assistant')).toBeInTheDocument()
    await expectLevelWithAvatar(log.querySelector('[data-slot="reply-body"]') as HTMLElement)
    // A short thread has nothing scrolled above it, so nothing fades: the first message is drawn in full.
    const thread = threadOf(panel)
    await expect(thread.scrollTop).toBe(0)
    await expect(fadeOf(thread)).toBe('none')
  },
}

// A window shorter than the panel (a laptop with Storybook's own chrome around the canvas): the panel shrinks to the window
// and the thread scrolls inside it, so the header and the composer are both on screen and the page itself does not scroll.
export const FitsAShortView: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'short', isRotated: false } },
  play: async ({ canvas }) => {
    await waitFor(() => expect(window.innerHeight).toBe(480))
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const box = panel.getBoundingClientRect()
    await expect(box.top).toBeGreaterThanOrEqual(0)
    await expect(box.bottom).toBeLessThanOrEqual(window.innerHeight)
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toBeVisible()
    const composer = canvas.getByRole('textbox', { name: 'Message' }).getBoundingClientRect()
    await expect(composer.bottom).toBeLessThanOrEqual(window.innerHeight)
    await expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    // The panel shrank to the window minus the usual 24px margin, evenly: the same margin above, below and at the sides.
    await expect(box.top).toBeCloseTo(24, 0)
    await expect(window.innerHeight - box.bottom).toBeCloseTo(24, 0)
    await expect(box.height).toBeCloseTo(window.innerHeight - 48, 0)
  },
}

export const AskAndStop: Story = {
  ...DESKTOP,
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'History' }))
    await expect(args.onHistory).toHaveBeenCalledTimes(1)
    // A suggestion fills the composer; it never sends.
    await userEvent.click(canvas.getByRole('button', { name: 'Draft a fix for the pricing page' }))
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await expect(box).toHaveValue('Draft a fix for the pricing page')
    await expect(args.onSubmit).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledWith('Draft a fix for the pricing page')
    await expect(canvas.getByRole('log', { name: 'Messages' })).toHaveTextContent('Draft a fix for the pricing page')
    // Every reply carries a (usually empty) status region; the working one fills just after it mounts.
    await waitFor(() => expect(canvas.getAllByRole('status').some((region) => region.textContent?.includes('Reading the page'))).toBe(true))
    // The working reply has no name row either: "Thinking" sits level with its avatar.
    const log = canvas.getByRole('log', { name: 'Messages' })
    await expectLevelWithAvatar(log.querySelector('.ai-shimmer') as HTMLElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    await expect(canvas.getByText('You stopped this answer.')).toBeVisible()
    await expectLevelWithAvatar(canvas.getByText('You stopped this answer.'))
    await expect(visibleNames(log)).toHaveLength(0)
    // Stop unmounts with the working state; the cursor must land back in the box, not on the page.
    await expect(box).toHaveFocus()
  },
}

export const RemoveScope: Story = {
  ...DESKTOP,
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await expect(box).toHaveAttribute('placeholder', 'Ask about this')
    await userEvent.click(canvas.getByRole('button', { name: 'Stop looking at Q3 report' }))
    await expect(canvas.queryByText('Looking at: Q3 report')).toBeNull()
    await expect(args.onScopeRemove).toHaveBeenCalledTimes(1)
    // The remove button is gone; the cursor must not fall to the page.
    await expect(box).toHaveFocus()
    await expect(box).toHaveAttribute('placeholder', 'Ask anything')
  },
}

// The app owns the scope and gave no way to remove it: the chip shows, with no dead remove button.
export const ControlledScope: Story = {
  ...DESKTOP,
  args: { scope: 'Pricing page', onScopeRemove: undefined },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Looking at: Pricing page')).toBeVisible()
    await expect(canvasElement.querySelector('[data-slot="scope-chip"] button')).toBeNull()
  },
}

export const NoScope: Story = {
  ...DESKTOP,
  args: { scope: null },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="scope-chip"]')).toBeNull()
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toHaveAttribute('placeholder', 'Ask anything')
  },
}

// The chip sits on the panel's wash, so its outline is measured against the washed colour, where the wash is strongest.
// This outline groups content rather than marking a control, so the floor is "clearly reads as a shape" (the earlier
// invisible pills were 1.1-1.3:1), not WCAG's 3:1 for controls.
export const ScopeChipReadsAsAShape: Story = {
  ...DESKTOP,
  play: async ({ canvasElement }) => {
    const chip = canvasElement.querySelector('[data-slot="scope-chip"]') as HTMLElement
    const surface = surfaceBehind(chip)
    const washed = washedTop(surface, chip)
    const outline = compositeOver(getComputedStyle(chip).borderTopColor, `rgb(${washed.join(' ')})`)
    const ratio = contrastRatio(outline, washed)
    console.log(`ai-side-panel scope chip outline on the wash ${ratio.toFixed(2)}:1`)
    await expect(ratio).toBeGreaterThanOrEqual(2)
  },
}

// Small grey text (the reply's name, a source's detail, "You stopped this answer.") can sit anywhere on the wash, so it
// is measured where the wash is strongest: the very top. WCAG 2.1 AA asks 4.5:1 of text this size.
export const MutedTextOnTheWashMeetsAA: Story = {
  ...DESKTOP,
  play: async ({ canvas }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const muted = panel.querySelector('.text-muted-foreground') as HTMLElement
    await expect(muted).not.toBeNull()
    const washed = washedTop(surfaceBehind(muted), muted)
    const ink = compositeOver(getComputedStyle(muted).color, `rgb(${washed.join(' ')})`)
    const ratio = contrastRatio(ink, washed)
    console.log(`ai-side-panel muted text on the wash top ${ratio.toFixed(2)}:1`)
    await expect(ratio).toBeGreaterThanOrEqual(4.5)
  },
}

export const ChipButtonShowsFocusRing: Story = {
  ...DESKTOP,
  play: async ({ canvas }) => {
    await expectFocusRing(canvas.getByRole('button', { name: 'Stop looking at Q3 report' }))
  },
}

// Without onHistory the button is not drawn: no button that does nothing.
export const NoHistory: Story = {
  ...DESKTOP,
  args: { onHistory: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'History' })).toBeNull()
    await expect(canvas.getByRole('region', { name: 'Assistant' })).toBeVisible()
  },
}

// A long thread scrolls inside the panel: the header and the composer stay inside the panel's box.
export const LongThreadScrolls: Story = {
  ...DESKTOP,
  parameters: { docs: { description: { story: 'A long conversation scrolling inside the panel: the header and the composer stay put while the thread moves.' } } },
  // The same frame as every other example (rounded, bordered, shadowed); only the height is shorter so the thread overflows.
  render: (args, { viewMode }) => <AiPanel onSubmit={args.onSubmit} onHistory={args.onHistory} className={`${fitHeight(viewMode, 'h-[28rem]', 'h-[min(28rem,calc(100dvh-3rem))]')} w-full max-w-sm rounded-xl border border-border shadow-md`} />,
  play: async ({ canvas }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const box = canvas.getByRole('textbox', { name: 'Message' })
    for (let turn = 1; turn <= 6; turn += 1) {
      await userEvent.type(box, `Question number ${turn}{Enter}`)
      await userEvent.click(await canvas.findByRole('button', { name: 'Stop' }))
    }
    const scroller = threadOf(panel)
    await expect(scroller).toBe(canvas.getByRole('log', { name: 'Messages' }).parentElement?.parentElement)
    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    const outer = panel.getBoundingClientRect()
    await expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(449)
    const composer = box.getBoundingClientRect()
    await expect(composer.bottom).toBeLessThanOrEqual(outer.bottom + 1)
    await expect(composer.top).toBeGreaterThanOrEqual(outer.top)
    const history = canvas.getByRole('button', { name: 'History' }).getBoundingClientRect()
    await expect(history.top).toBeGreaterThanOrEqual(outer.top)
    await expect(history.bottom).toBeLessThanOrEqual(outer.bottom)
    // The newest turn is the one in view.
    await expect(scroller.scrollTop + scroller.clientHeight).toBeGreaterThanOrEqual(scroller.scrollHeight - 2)
    // Messages are scrolled above, so they fade out under the header: a mask (no colour, so the wash shows through
    // in every theme), from clear at the top edge to solid 28px down.
    await waitFor(() => expect(fadeOf(scroller)).toContain('gradient'))
    await expect(fadeOf(scroller)).toMatch(/28px\)$/)
    // A mask is not an element: nothing sits over the thread to take a press meant for a message.
    const edge = scroller.getBoundingClientRect()
    await expect(scroller.contains(document.elementFromPoint(edge.left + edge.width / 2, edge.top + 10))).toBe(true)
    // Back at the very top there is nothing above to fade, and the first thing in the thread is drawn in full.
    scroller.scrollTop = 0
    await waitFor(() => expect(fadeOf(scroller)).toBe('none'))
    // A nudge that only moves the thread's own 4px of top padding fades nothing: no message is under the header yet.
    scroller.scrollTop = 4
    await new Promise((resolve) => window.setTimeout(resolve, 100))
    await expect(scroller.scrollTop).toBe(4)
    await expect(fadeOf(scroller)).toBe('none')
    scroller.scrollTop = 5
    await waitFor(() => expect(fadeOf(scroller)).toContain('gradient'))
    scroller.scrollTop = scroller.scrollHeight
    await waitFor(() => expect(fadeOf(scroller)).toMatch(/28px\)$/))
    // A control reached by keyboard is scrolled clear of the fade, so its focus ring is never drawn half-faded.
    // Walking back from the composer passes every control in the thread: the first reply's Copy and source chip
    // (mid-thread), then the chip's remove button (the very top).
    await userEvent.click(box)
    let visited = 0
    for (let press = 0; press < 6; press += 1) {
      await userEvent.tab({ shift: true })
      const focused = document.activeElement as HTMLElement
      if (!scroller.contains(focused)) break
      visited += 1
      await waitFor(() => {
        const fade = /([\d.]+)px\)$/.exec(fadeOf(scroller))
        const fadeBottom = scroller.getBoundingClientRect().top + (fade ? Number(fade[1]) : 0)
        // 3px: the focus ring is drawn outside the control.
        expect(focused.getBoundingClientRect().top - 3).toBeGreaterThanOrEqual(fadeBottom)
      })
    }
    await expect(visited).toBeGreaterThanOrEqual(3)
    // Chromium centres a focused control; other browsers bring it just inside the nearest edge, which here is the
    // faded one. The thread's scroll padding is what keeps it clear there, so that route is measured too.
    const copy = canvas.getByRole('button', { name: 'Copy' })
    scroller.scrollTop = scroller.scrollHeight
    copy.scrollIntoView({ block: 'nearest' })
    await waitFor(() => expect(fadeOf(scroller)).toMatch(/28px\)$/))
    await expect(copy.getBoundingClientRect().top - 3).toBeGreaterThanOrEqual(scroller.getBoundingClientRect().top + 28)
    // The names kept for screen readers scroll with their replies. Left behind at their unscrolled places they would
    // hang below the panel and make the page itself scroll.
    await expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    for (const name of Array.from(scroller.querySelectorAll('[data-slot="reply-name"]'))) {
      const reply = (name.closest('article') as HTMLElement).getBoundingClientRect()
      await expect(name.getBoundingClientRect().top).toBeGreaterThanOrEqual(reply.top - 1)
      await expect(name.getBoundingClientRect().bottom).toBeLessThanOrEqual(reply.bottom + 1)
    }
    // Leave the example as people meet it: the cursor in the box, the newest turn in view, the older ones fading out
    // under the header.
    await userEvent.click(box)
    scroller.scrollTop = scroller.scrollHeight
    await waitFor(() => expect(scroller.scrollTop + scroller.clientHeight).toBeGreaterThanOrEqual(scroller.scrollHeight - 2))
  },
}

// The block's thread is sample content an app replaces in its own copy, often with other kit pieces. Those carry
// boxes kept for screen readers that are absolutely positioned; the thread is their positioned ancestor, so they
// scroll with it. Left to the page, they would sit at their unscrolled places below the panel and make the page scroll.
// The pieces are put into the real thread through a portal, the nearest a story can get to an edited copy.
function KitPiecesInTheThread() {
  const [log, setLog] = React.useState<Element | null>(null)
  const anchor = React.useRef<HTMLSpanElement>(null)
  React.useEffect(() => { setLog(anchor.current?.parentElement?.querySelector('[role="log"]') ?? null) }, [])
  return (
    <>
      <span ref={anchor} hidden />
      {log ? createPortal(
        <>
          {[1, 2, 3].map((draft) => (
            <ApprovalCard key={draft} title={`The agent wants to publish draft ${draft}`} details={[{ label: 'Page', value: 'Pricing' }]}
              defaultBody="Annual plans move back under monthly ones, as they were before 9 September." actionLabel="Publish" onApprove={() => {}} onDeny={() => {}} />
          ))}
          <AgentSteps title="Fixing the pricing page" steps={[{ label: 'Read the page', status: 'done' }, { label: 'Draft the change', status: 'running' }, { label: 'Check the links', status: 'waiting' }]} />
        </>,
        log,
      ) : null}
    </>
  )
}

export const ThreadHoldsOtherKitPieces: Story = {
  ...DESKTOP,
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'Other kit pieces in the thread scroll with it, including the text they keep for screen readers.' } } },
  render: (args, { viewMode }) => (
    <>
      <AiPanel onSubmit={args.onSubmit} onHistory={args.onHistory}
        className={`${fitHeight(viewMode, 'h-[28rem]', 'h-[min(28rem,calc(100dvh-3rem))]')} w-full max-w-sm rounded-xl border border-border shadow-md`} />
      <KitPiecesInTheThread />
    </>
  ),
  play: async ({ canvas }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const thread = threadOf(panel)
    await waitFor(() => expect(within(thread).getAllByRole('button', { name: 'Publish' })).toHaveLength(3))
    await expect(within(thread).getByText('Fixing the pricing page')).toBeInTheDocument()
    // Far more than the window holds, so anything left at its unscrolled place would hang below the window.
    await expect(thread.scrollHeight).toBeGreaterThan(window.innerHeight)
    thread.scrollTop = thread.scrollHeight
    await waitFor(() => expect(fadeOf(thread)).toContain('gradient'))
    await expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight)
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

// No extra wrapper: a block div around an inline button adds a line box a little taller than the button, which nudged
// it half a pixel off-centre. The story wrapper's own padding is the margin.
const inSheet = (args: Story['args']) => (
  <AiSidePanel {...args} trigger={<AiButton variant="outline">Ask the assistant</AiButton>} />
)

export const InASheet: Story = {
  ...DESKTOP,
  render: inSheet,
  play: async ({ canvas, args }) => {
    // The Sheet renders in a portal on the page body, outside the canvas.
    const page = within(document.body)
    const closed = () => waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(page.queryByRole('dialog')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Ask the assistant' }))
    let dialog = await page.findByRole('dialog', { name: 'Assistant' })
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true)
    // Opening puts the cursor inside the panel, not on the page behind it.
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    // The Sheet fades in, and a faded-out element counts as hidden.
    await waitFor(() => expect(within(dialog).getByText('Looking at: Q3 report')).toBeVisible())
    await expect(within(dialog).getByRole('textbox', { name: 'Message' })).toBeVisible()
    // On a desktop the panel is the stock Sheet's width (24rem), docked to the right edge, once it has slid in.
    await expect(window.innerWidth).toBe(1024)
    await waitFor(() => expect(dialog.getBoundingClientRect().right).toBe(1024))
    await expect(dialog.getBoundingClientRect().width).toBe(384)
    // One Close: the panel's own. The Sheet's corner button is switched off.
    await expect(within(dialog).getAllByRole('button', { name: 'Close' })).toHaveLength(1)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await closed()
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false)
    // Closing hands focus back to what opened it.
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Ask the assistant' })).toHaveFocus())
    // Escape closes it too.
    await userEvent.click(canvas.getByRole('button', { name: 'Ask the assistant' }))
    dialog = await page.findByRole('dialog', { name: 'Assistant' })
    await userEvent.keyboard('{Escape}')
    await closed()
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Ask the assistant' })).toHaveFocus())
  },
}

// People open the assistant to ask it something, so the cursor is in the message box, not on History (the first
// button, where the Sheet would put it). Closing still hands focus back to whatever opened the panel.
export const OpensWithTheCursorInTheMessageBox: Story = {
  ...DESKTOP,
  render: inSheet,
  play: async ({ canvas }) => {
    const page = within(document.body)
    const trigger = canvas.getByRole('button', { name: 'Ask the assistant' })
    await tabTo(trigger)
    await userEvent.keyboard('{Enter}')
    let dialog = await page.findByRole('dialog', { name: 'Assistant' })
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: 'Message' })))
    // Typing goes straight into the box.
    await userEvent.keyboard('Why the dip?')
    await expect(within(dialog).getByRole('textbox', { name: 'Message' })).toHaveValue('Why the dip?')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
    // Opened with the mouse, the same.
    await userEvent.click(trigger)
    dialog = await page.findByRole('dialog', { name: 'Assistant' })
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: 'Message' })))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

// The app opens the panel itself (the `open` prop, no trigger), so the Sheet never sees what was pressed and cannot
// tell a finger from a mouse. The panel then goes by the device: on a touch screen (a coarse pointer) focus stays on
// the panel, so the on-screen keyboard does not cover it; anywhere else the cursor goes into the message box.
export const OpenedByTheApp: Story = {
  ...DESKTOP,
  render: function Render(args) {
    const [open, setOpen] = React.useState(false)
    return (
      <>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>Open from the app</Button>
        <AiSidePanel {...args} open={open} onOpenChange={(next) => { setOpen(next); args.onOpenChange?.(next) }} />
      </>
    )
  },
  play: async ({ canvas }) => {
    const page = within(document.body)
    const opener = canvas.getByRole('button', { name: 'Open from the app' })
    const closed = () => waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    // The test browser has a mouse, not a touch screen.
    await expect(window.matchMedia('(pointer: coarse)').matches).toBe(false)
    await userEvent.click(opener)
    let dialog = await page.findByRole('dialog', { name: 'Assistant' })
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: 'Message' })))
    await userEvent.keyboard('{Escape}')
    await closed()
    // The same press on a touch screen. The device is stood in for by answering the one media query the panel asks;
    // every other query gets the browser's own answer.
    const realMatchMedia = window.matchMedia.bind(window)
    const media = spyOn(window, 'matchMedia').mockImplementation((query: string) => (
      query === '(pointer: coarse)' ? { ...realMatchMedia(query), matches: true, media: query } as MediaQueryList : realMatchMedia(query)
    ))
    try {
      await userEvent.click(opener)
      dialog = await page.findByRole('dialog', { name: 'Assistant' })
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
      await waitFor(() => expect(within(dialog).getByRole('textbox', { name: 'Message' })).toBeVisible())
      await expect(document.activeElement).toBe(dialog)
      await expect(media).toHaveBeenCalledWith('(pointer: coarse)')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
      await closed()
    } finally {
      media.mockRestore()
    }
  },
}

// On a phone the stock Sheet leaves a quarter of the screen to the page behind it. The assistant takes the whole width:
// a 280px column is too narrow for a conversation, and the strip beside it is too thin to be useful.
export const Phone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  render: inSheet,
  play: async ({ canvas }) => {
    await waitFor(() => expect(window.innerWidth).toBe(375))
    // A finger, not a mouse: this is how the panel is opened on a phone.
    await userEvent.pointer({ keys: '[TouchA]', target: canvas.getByRole('button', { name: 'Ask the assistant' }) })
    const page = within(document.body)
    const dialog = await page.findByRole('dialog', { name: 'Assistant' })
    // Opened by touch, focus goes to the panel itself, not into the message box: that would throw the on-screen
    // keyboard over half the panel before anything has been read.
    await waitFor(() => expect(document.activeElement).toBe(dialog))
    // Edge to edge once it has slid in.
    await waitFor(() => expect(dialog.getBoundingClientRect().right).toBe(375))
    await expect(dialog.getBoundingClientRect().left).toBe(0)
    await expect(dialog.getBoundingClientRect().width).toBe(375)
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
    await expect(within(dialog).getByRole('textbox', { name: 'Message' })).toBeVisible()
    // With no page left to press beside the panel, Close has to be on screen and has to work.
    const close = within(dialog).getByRole('button', { name: 'Close' })
    await waitFor(() => expect(close).toBeVisible())
    const closeBox = close.getBoundingClientRect()
    await expect(closeBox.left).toBeGreaterThanOrEqual(0)
    await expect(closeBox.right).toBeLessThanOrEqual(375)
    await expect(close.contains(document.elementFromPoint(closeBox.left + closeBox.width / 2, closeBox.top + closeBox.height / 2))).toBe(true)
    await userEvent.click(close)
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
  },
}

// From here on the thread is the app's own (CRA-279): `children` replaces the sample conversation, and the app drives
// the composer. The same frame as every other example; the shorter one makes a few turns overflow.
const framed = (viewMode: string, height: '35rem' | '28rem' = '35rem') =>
  `${height === '35rem' ? fitHeight(viewMode, 'h-[35rem]', 'h-[min(35rem,calc(100dvh-3rem))]') : fitHeight(viewMode, 'h-[28rem]', 'h-[min(28rem,calc(100dvh-3rem))]')} w-full max-w-sm rounded-xl border border-border shadow-md`
const atNewest = (scroller: HTMLElement) => scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2

// `reply`: text is an answer, null is a stopped answer, undefined is one still being written.
type OwnTurn = { id: number; ask: string; reply?: string | null }
const OWN_TURNS: OwnTurn[] = [
  { id: 1, ask: 'Which plan do most new teams pick?', reply: 'Team, by a wide margin: 61% of September signups chose it, up from 48% in August.' },
  { id: 2, ask: 'And the ones who leave in the first month?', reply: 'Mostly Starter. Four in five of them never invited a second person.' },
  { id: 3, ask: 'Draft a nudge for those accounts.' },
]
const ownTurn = (turn: OwnTurn) => (
  <React.Fragment key={turn.id}>
    <UserMessage>{turn.ask}</UserMessage>
    {/* hideName on every reply, as the sample does: the header already says who is answering. */}
    {turn.reply === undefined
      ? <AiMessage hideName streaming thinking={<AiThinking status="working" activity="Checking the plan mix" />} />
      : turn.reply === null ? <AiMessage hideName stopped /> : <AiMessage hideName><p>{turn.reply}</p></AiMessage>}
  </React.Fragment>
)

// The app's side: it owns the turns and whether a reply is being written, and applies what the panel reports.
function AppThreadPanel({ args, className }: { args: Story['args']; className: string }) {
  const [turns, setTurns] = React.useState(OWN_TURNS)
  const [status, setStatus] = React.useState<'idle' | 'working'>('working')
  // Two things that come from outside the panel in a real app; the test asks for each with an event. "Regenerate the
  // last reply" starts writing without adding a turn; a turn arriving from elsewhere adds one without any writing.
  React.useEffect(() => {
    const regenerate = () => { setTurns((all) => all.map((turn, index) => (index === all.length - 1 ? { ...turn, reply: undefined } : turn))); setStatus('working') }
    const arrive = () => setTurns((all) => [...all, { id: all.length + 1, ask: 'Send it on Monday instead.', reply: 'Done: it is set for Monday at 9.' }])
    window.addEventListener('quill-story-regenerate', regenerate)
    window.addEventListener('quill-story-turn-arrives', arrive)
    return () => {
      window.removeEventListener('quill-story-regenerate', regenerate)
      window.removeEventListener('quill-story-turn-arrives', arrive)
    }
  }, [])
  return (
    <AiPanel scope="Pricing page" status={status} className={className}
      onStop={() => { setTurns((all) => all.map((turn, index) => (index === all.length - 1 ? { ...turn, reply: null } : turn))); setStatus('idle'); args?.onStop?.() }}
      onSubmit={(text) => { setTurns((all) => [...all, { id: all.length + 1, ask: text }]); setStatus('working'); args?.onSubmit?.(text) }}>
      {turns.map(ownTurn)}
    </AiPanel>
  )
}

export const AppThread: Story = {
  ...DESKTOP,
  args: { onStop: fn() },
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'The app\'s own conversation, passed as children. The app says when a reply is being written (status), and hears Stop and Send.' } } },
  render: (args, { viewMode }) => <AppThreadPanel args={args} className={framed(viewMode, '28rem')} />,
  play: async ({ canvas, args }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const log = within(panel).getByRole('log', { name: 'Messages' })
    // None of the sample conversation is here: not its messages, not its follow-up.
    await expect(log).not.toHaveTextContent('The September dip.')
    await expect(log).not.toHaveTextContent("What's the one thing to fix?")
    await expect(within(panel).queryByRole('list', { name: 'Follow-ups' })).toBeNull()
    await expect(within(panel).queryByText('Draft a fix for the pricing page')).toBeNull()
    // The app's turns are, in the log.
    await expect(log).toHaveTextContent('Which plan do most new teams pick?')
    await expect(log).toHaveTextContent('Four in five of them never invited a second person.')
    // The header says "Assistant"; the app's replies passed hideName, so none repeats it.
    await expect(visibleNames(log)).toHaveLength(0)
    // Longer than the panel, and opened on the newest turn.
    const scroller = threadOf(panel)
    await expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight)
    await waitFor(() => expect(atNewest(scroller)).toBe(true))
    // The app said a reply is being written, so the composer offers Stop; pressing it tells the app.
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    await expect(args.onStop).toHaveBeenCalledTimes(1)
    await expect(canvas.getByText('You stopped this answer.')).toBeVisible()
    // Stop unmounts as the app goes idle; the cursor lands back in the box, as it does with the sample.
    await expect(box).toHaveFocus()
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull()
    // Sending tells the app once. The panel adds nothing of its own: the one new message is the app's, and there is
    // no pretend reply ("Reading the page" is the sample's).
    scroller.scrollTop = 0
    await userEvent.type(box, 'Make it shorter{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledTimes(1)
    await expect(args.onSubmit).toHaveBeenCalledWith('Make it shorter')
    await expect(within(log).getAllByText('Make it shorter')).toHaveLength(1)
    await expect(log.querySelectorAll('article')).toHaveLength(4)
    await expect(log).not.toHaveTextContent('Reading the page')
    await expect(box).toHaveValue('')
    // A turn was added below a thread scrolled to its top: the newest is brought into view.
    await waitFor(() => expect(atNewest(scroller)).toBe(true))
    await userEvent.click(await canvas.findByRole('button', { name: 'Stop' }))
    await expect(args.onStop).toHaveBeenCalledTimes(2)
    // The app starts writing again without adding a turn (the last reply is regenerated): the same.
    scroller.scrollTop = 0
    await waitFor(() => expect(scroller.scrollTop).toBe(0))
    window.dispatchEvent(new Event('quill-story-regenerate'))
    await canvas.findByRole('button', { name: 'Stop' })
    await expect(log.querySelectorAll('article')).toHaveLength(4)
    await waitFor(() => expect(atNewest(scroller)).toBe(true))
    // And a turn added while nothing is being written is brought into view as well.
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    scroller.scrollTop = 0
    await waitFor(() => expect(scroller.scrollTop).toBe(0))
    window.dispatchEvent(new Event('quill-story-turn-arrives'))
    await expect(await within(log).findByText('Done: it is set for Monday at 9.')).toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull()
    await waitFor(() => expect(atNewest(scroller)).toBe(true))
  },
}

// An app with nothing said yet passes null (or an empty list): an empty thread, not the sample.
export const EmptyAppThread: Story = {
  ...DESKTOP,
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'A new conversation: the app passed an empty thread, so nothing of the sample is shown.' } } },
  render: (args, { viewMode }) => <AiPanel scope="Pricing page" onSubmit={args.onSubmit} onHistory={args.onHistory} className={framed(viewMode)}>{null}</AiPanel>,
  play: async ({ canvas, args }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    // The log is on the page, empty, before the first turn, so the first turn is read out when it arrives.
    const log = panel.querySelector('[role="log"]') as HTMLElement
    await expect(log).toHaveAttribute('aria-label', 'Messages')
    await expect(log).toBeEmptyDOMElement()
    await expect(panel).not.toHaveTextContent('The September dip.')
    await expect(within(panel).queryByRole('list', { name: 'Follow-ups' })).toBeNull()
    await expect(within(panel).getByText('Looking at: Pricing page')).toBeVisible()
    // Sending still reports, and still adds nothing by itself.
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, 'Where do I start?{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledWith('Where do I start?')
    await expect(log).toBeEmptyDOMElement()
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull()
    await expect(box).toHaveValue('')
  },
}

// The app owns the composer's text: here it starts with a draft, and clears it once it has been sent.
function ControlledComposerPanel({ args, className }: { args: Story['args']; className: string }) {
  const [draft, setDraft] = React.useState('Summarise this page for the board')
  return (
    <AiPanel scope="Pricing page" value={draft} className={className}
      onValueChange={(next) => { setDraft(next); args?.onValueChange?.(next) }}
      onSubmit={(text) => { setDraft(''); args?.onSubmit?.(text) }}>
      {null}
    </AiPanel>
  )
}

export const ControlledComposer: Story = {
  ...DESKTOP,
  args: { onValueChange: fn() },
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'The app holds the composer\'s text (value and onValueChange): it starts with a draft, and the app clears it after sending.' } } },
  render: (args, { viewMode }) => <ControlledComposerPanel args={args} className={framed(viewMode)} />,
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await expect(box).toHaveValue('Summarise this page for the board')
    await userEvent.type(box, ', briefly')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Summarise this page for the board, briefly')
    await expect(box).toHaveValue('Summarise this page for the board, briefly')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledTimes(1)
    await expect(args.onSubmit).toHaveBeenCalledWith('Summarise this page for the board, briefly')
    // Emptied by the app, in its onSubmit.
    await expect(box).toHaveValue('')
  },
}

// The other half of "controlled": a value the app does not change stays, whatever is typed or sent. The panel keeps
// no copy of its own and does not clear the app's.
export const ControlledValueIsTheApps: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { value: 'Fixed by the app', onValueChange: fn() },
  render: (args, { viewMode }) => <AiPanel value={args.value} onValueChange={args.onValueChange} onSubmit={args.onSubmit} className={framed(viewMode)} />,
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '!')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Fixed by the app!')
    await expect(box).toHaveValue('Fixed by the app')
    // The sample's suggestion asks the app too, instead of writing into the box behind its back.
    await userEvent.click(canvas.getByRole('button', { name: 'Draft a fix for the pricing page' }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Draft a fix for the pricing page')
    await expect(box).toHaveValue('Fixed by the app')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledWith('Fixed by the app')
    await expect(box).toHaveValue('Fixed by the app')
    await expect(args.onValueChange).not.toHaveBeenCalledWith('')
  },
}

const HISTORY_NOW = new Date(2026, 9, 6, 12, 0)
const HISTORY_CHATS: Array<Conversation & { ask: string; reply: string }> = [
  { id: 'q3', title: 'Q3 signups vs target', updatedAt: new Date(2026, 9, 6, 9, 0), ask: 'How did signups do against target?', reply: 'Ahead in July and August, 12% short in September. The quarter closed 4% ahead.' },
  { id: 'launch', title: 'Launch brief draft', updatedAt: new Date(2026, 9, 6, 8, 0), ask: 'Start a brief for the annual-plans launch.', reply: 'Here is a first outline: the problem, who it is for, what changes on the pricing page, and how we will know it worked.' },
  { id: 'pricing', title: 'Pricing page copy ideas', updatedAt: new Date(2026, 9, 5, 16, 0), ask: 'Three headlines for the pricing page.', reply: 'Pay for the team you have. One price, every feature. Start small, grow when you are ready.' },
]
const HISTORY_EARLIER = ['What changed on the page in September?', 'Who signed off on it?', 'When did the dip start?', 'Is it the same on phones?']

// History inside the panel: pressing History swaps the thread for the list (`body`); choosing a chat swaps back.
function PanelWithHistory({ args, className }: { args: Story['args']; className: string }) {
  const [listOpen, setListOpen] = React.useState(false)
  const [current, setCurrent] = React.useState('q3')
  const chat = HISTORY_CHATS.find((each) => each.id === current) ?? HISTORY_CHATS[0]
  return (
    <AiPanel scope="Pricing page" onSubmit={args?.onSubmit} className={className}
      onHistory={() => { setListOpen((was) => !was); args?.onHistory?.() }}
      body={listOpen ? (
        <ConversationHistory label="Past chats" now={HISTORY_NOW} conversations={HISTORY_CHATS} currentId={current}
          onSelect={(id) => { setCurrent(id); setListOpen(false) }} />
      ) : undefined}>
      {current === 'q3' ? HISTORY_EARLIER.map((ask) => (
        <React.Fragment key={ask}>
          <UserMessage>{ask}</UserMessage>
          <AiMessage hideName><p>That is in the changelog for 9 September; I can pull the exact entry if you need it.</p></AiMessage>
        </React.Fragment>
      )) : null}
      <UserMessage>{chat.ask}</UserMessage>
      <AiMessage hideName><p>{chat.reply}</p></AiMessage>
    </AiPanel>
  )
}

export const HistoryInThePanel: Story = {
  ...DESKTOP,
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'History shows the conversation-history list in the panel itself, in place of the thread. The header and the composer stay; choosing a chat brings the thread back.' } } },
  render: (args, { viewMode }) => <PanelWithHistory args={args} className={framed(viewMode, '28rem')} />,
  play: async ({ canvas, canvasElement }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const scroller = threadOf(panel)
    const box = canvas.getByRole('textbox', { name: 'Message' })
    const history = canvas.getByRole('button', { name: 'History' })
    await expect(within(panel).getByRole('log', { name: 'Messages' })).toHaveTextContent('How did signups do against target?')
    await expect(canvasElement.querySelector('[data-slot="conversation-history"]')).toBeNull()
    // Somewhere in the middle of a long thread. The panel learns where the thread is from its scroll events, which
    // arrive a frame late: going by way of the top (no fade) makes the fade's return the sign that 60 has been heard.
    await expect(scroller.scrollHeight - scroller.clientHeight).toBeGreaterThan(80)
    scroller.scrollTop = 0
    await waitFor(() => expect(fadeOf(scroller)).toBe('none'))
    scroller.scrollTop = 60
    await waitFor(() => expect(fadeOf(scroller)).toContain('gradient'))
    // History swaps the thread for the list, in the same scrolling area, starting at its top (so nothing is faded).
    await userEvent.click(history)
    const list = await within(panel).findByRole('navigation', { name: 'Past chats' })
    await expect(list).toBeVisible()
    await expect(scroller).toContainElement(list)
    await expect(scroller.scrollTop).toBe(0)
    await waitFor(() => expect(fadeOf(scroller)).toBe('none'))
    // The list is not a message: it is not in the log, and while it shows there is no log (or scope chip) to read.
    await expect(list.closest('[role="log"]')).toBeNull()
    await expect(within(panel).queryByRole('log')).toBeNull()
    await expect(within(panel).queryByText('How did signups do against target?')).not.toBeVisible()
    await expect(panel.querySelector('[data-slot="scope-chip"]')).not.toBeVisible()
    // The header and the composer stay.
    await expect(box).toBeVisible()
    await expect(history).toBeVisible()
    await expect(panel).toContainElement(list)
    const outer = panel.getBoundingClientRect()
    await expect(list.getBoundingClientRect().top).toBeGreaterThanOrEqual(history.getBoundingClientRect().bottom)
    await expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.getBoundingClientRect().top)
    await expect(box.getBoundingClientRect().bottom).toBeLessThanOrEqual(outer.bottom)
    // The open chat is marked in the list.
    await expect(within(list).getByRole('button', { name: 'Q3 signups vs target' })).toHaveAttribute('aria-current', 'true')
    // History again: the thread is back where it was.
    await userEvent.click(history)
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="conversation-history"]')).toBeNull())
    await expect(within(panel).getByRole('log', { name: 'Messages' })).toHaveTextContent('How did signups do against target?')
    await expect(scroller.scrollTop).toBe(60)
    // Choosing a chat swaps back too, to that chat. The row that was pressed is gone with the list; the cursor
    // lands in the message box, not on the page.
    await userEvent.click(history)
    await userEvent.click(await within(panel).findByRole('button', { name: 'Launch brief draft' }))
    await waitFor(() => expect(canvasElement.querySelector('[data-slot="conversation-history"]')).toBeNull())
    await expect(within(panel).getByRole('log', { name: 'Messages' })).toHaveTextContent('Start a brief for the annual-plans launch.')
    await expect(within(panel).getByText('Looking at: Pricing page')).toBeVisible()
    await waitFor(() => expect(box).toHaveFocus())
  },
}

// `body` written the two usual ways, `open ? <List /> : null` and `open && <List />`, is "no body" while closed:
// the thread shows. Only a real node takes the thread's place.
const expectThreadNotBody = async (canvasElement: HTMLElement) => {
  const panel = within(canvasElement).getByRole('region', { name: 'Assistant' })
  await expect(within(panel).getByRole('log', { name: 'Messages' })).toBeVisible()
  await expect(within(panel).getByRole('log', { name: 'Messages' })).toHaveTextContent('The September dip.')
  await expect(within(panel).getByText('Looking at: Q3 report')).toBeVisible()
  await expect(panel.querySelector('[data-slot="panel-body"]')).toBeNull()
  await expect(panel.querySelector('[hidden]')).toBeNull()
}
export const BodyNullShowsTheThread: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { body: null },
  render: (args, { viewMode }) => <AiPanel body={args.body} onSubmit={args.onSubmit} className={framed(viewMode)} />,
  play: async ({ canvasElement }) => expectThreadNotBody(canvasElement),
}
export const BodyFalseShowsTheThread: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { body: false },
  render: (args, { viewMode }) => <AiPanel body={args.body} onSubmit={args.onSubmit} className={framed(viewMode)} />,
  play: async ({ canvasElement }) => expectThreadNotBody(canvasElement),
}

// On a touch screen, putting the cursor in the message box would throw the on-screen keyboard over the chat that was
// just chosen. The panel itself takes focus there, as it does when the Sheet opens.
export const ChoosingAChatOnATouchScreen: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  render: (args, { viewMode }) => <PanelWithHistory args={args} className={framed(viewMode, '28rem')} />,
  play: async ({ canvas }) => {
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const box = canvas.getByRole('textbox', { name: 'Message' })
    const realMatchMedia = window.matchMedia.bind(window)
    const media = spyOn(window, 'matchMedia').mockImplementation((query: string) => (
      query === '(pointer: coarse)' ? { ...realMatchMedia(query), matches: true, media: query } as MediaQueryList : realMatchMedia(query)
    ))
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'History' }))
      await userEvent.click(await within(panel).findByRole('button', { name: 'Launch brief draft' }))
      await expect(within(panel).getByRole('log', { name: 'Messages' })).toHaveTextContent('Start a brief for the annual-plans launch.')
      // Not lost to the page, and not in the box.
      await waitFor(() => expect(document.activeElement).toBe(panel))
      await expect(box).not.toHaveFocus()
      await expect(media).toHaveBeenCalledWith('(pointer: coarse)')
      // The panel was made focusable for that moment only: once focus moves on, it is as it was.
      await expect(panel).toHaveAttribute('tabindex', '-1')
      await userEvent.click(box)
      await expect(box).toHaveFocus()
      await expect(panel).not.toHaveAttribute('tabindex')
    } finally {
      media.mockRestore()
    }
  },
}

// Anything React draws nothing for is "no body": `text && <List />` with an empty string, or a stray `true`.
export const BodyEmptyStringShowsTheThread: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { body: '' },
  render: (args, { viewMode }) => <AiPanel body={args.body} onSubmit={args.onSubmit} className={framed(viewMode)} />,
  play: async ({ canvasElement }) => expectThreadNotBody(canvasElement),
}
export const BodyTrueShowsTheThread: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { body: true },
  render: (args, { viewMode }) => <AiPanel body={args.body} onSubmit={args.onSubmit} className={framed(viewMode)} />,
  play: async ({ canvasElement }) => expectThreadNotBody(canvasElement),
}

// An app's own dialog around an inline panel is the app's: on a touch screen the panel's own section takes focus,
// and the dialog is not given a tabindex it did not have.
export const InsideAnAppsOwnDialogOnATouchScreen: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  render: (args, { viewMode }) => (
    <div role="dialog" aria-label="The app's own dialog" className="contents">
      <PanelWithHistory args={args} className={framed(viewMode, '28rem')} />
    </div>
  ),
  play: async ({ canvas }) => {
    const own = canvas.getByRole('dialog', { name: "The app's own dialog" })
    const panel = canvas.getByRole('region', { name: 'Assistant' })
    const realMatchMedia = window.matchMedia.bind(window)
    const media = spyOn(window, 'matchMedia').mockImplementation((query: string) => (
      query === '(pointer: coarse)' ? { ...realMatchMedia(query), matches: true, media: query } as MediaQueryList : realMatchMedia(query)
    ))
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'History' }))
      await userEvent.click(await within(panel).findByRole('button', { name: 'Launch brief draft' }))
      await waitFor(() => expect(document.activeElement).toBe(panel))
      await expect(own).not.toHaveAttribute('tabindex')
    } finally {
      media.mockRestore()
    }
  },
}
