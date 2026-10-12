import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import { expect, fn, spyOn, userEvent, waitFor } from 'storybook/test'
import { AiMessage, UserMessage } from '../../registry/lib/ai-message'
import { AiThinking } from '../../registry/lib/ai-thinking'
import { Citation } from '../../registry/lib/citations'
import { usage } from '@/usage/ai-message.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'grid w-[36rem] max-w-full gap-4'

const meta = {
  title: 'Components / AiMessage',
  component: AiMessage,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: renderUsageDocs(usage) } } },
  decorators: [inColumn(COLUMN)],
  args: { children: <p>September missed target by 12%, but July and August each beat it, so the quarter still closed 4% ahead.</p> },
} satisfies Meta<typeof AiMessage>

export default meta
type Story = StoryObj<typeof meta>

export const Reply: Story = {
  args: { onRetry: fn(), onFeedback: fn() },
  render: (args) => (<><UserMessage>How did signups do against target this quarter?</UserMessage><AiMessage {...args} /></>),
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('article')).toHaveTextContent('4% ahead')
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }))
    await expect(args.onRetry).toHaveBeenCalled()
    const bad = canvas.getByRole('button', { name: 'Bad answer' })
    await userEvent.click(bad)
    await expect(bad).toHaveAttribute('aria-pressed', 'true')
    await expect(args.onFeedback).toHaveBeenLastCalledWith('down')
    await userEvent.click(bad)
    await expect(bad).toHaveAttribute('aria-pressed', 'false')
    await expect(args.onFeedback).toHaveBeenLastCalledWith(null)
  },
}
export const AvatarAlignsWithName: Story = {
  play: async ({ canvas }) => {
    const article = canvas.getByRole('article')
    const avatar = article.querySelector('[data-slot="reply-avatar"]') as HTMLElement
    const nameRow = article.querySelector('[data-slot="reply-name"]') as HTMLElement
    const a = avatar.getBoundingClientRect()
    const n = nameRow.getBoundingClientRect()
    // The 28px avatar and the name row share one centre line.
    await expect(Math.abs((a.top + a.bottom) / 2 - (n.top + n.bottom) / 2)).toBeLessThanOrEqual(1)
  },
}
// The vertical centre of an element's first line of text, from the glyphs' own box (a block's box would be all its lines).
const firstLineCentre = (element: Element) => {
  // The first text node, not the element: a range around a whole paragraph reports the paragraph's box.
  const range = document.createRange()
  range.selectNodeContents(document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode() as Text)
  const line = range.getClientRects()[0]
  return (line.top + line.bottom) / 2
}
const avatarCentre = (article: Element) => {
  const box = (article.querySelector('[data-slot="reply-avatar"]') as HTMLElement).getBoundingClientRect()
  return (box.top + box.bottom) / 2
}
// With the name hidden it is still the reply's only speaker label (the avatar is decoration), so it stays on the page
// for screen readers as a 1px clipped box: not display: none, not aria-hidden.
const expectNameHiddenButRead = async (article: HTMLElement, name = 'Assistant') => {
  const label = Array.from(article.querySelectorAll('p')).find((paragraph) => paragraph.textContent === name) as HTMLElement
  await expect(label).toBeDefined()
  const row = article.querySelector('[data-slot="reply-name"]') as HTMLElement
  const box = row.getBoundingClientRect()
  await expect(box.width).toBeLessThanOrEqual(1)
  await expect(box.height).toBeLessThanOrEqual(1)
  await expect(getComputedStyle(row).display).not.toBe('none')
  await expect(getComputedStyle(row).visibility).toBe('visible')
  await expect(label.closest('[aria-hidden="true"], [hidden]')).toBeNull()
}
// The panel's header already names the assistant, so its replies drop the visible name. The answer then starts level
// with the avatar: no empty row where the name was, and the first line shares the avatar's centre line.
export const HiddenName: Story = {
  args: { hideName: true },
  play: async ({ canvas }) => {
    const article = canvas.getByRole('article')
    await expectNameHiddenButRead(article)
    const body = article.querySelector('[data-slot="reply-body"]') as HTMLElement
    await expect(Math.abs(firstLineCentre(body) - avatarCentre(article))).toBeLessThanOrEqual(1)
    const avatar = (article.querySelector('[data-slot="reply-avatar"]') as HTMLElement).getBoundingClientRect()
    await expect(body.getBoundingClientRect().top).toBeLessThan(avatar.top + avatar.height / 2)
    // Hiding the name changes nothing else: the answer and its actions are all there.
    await expect(canvas.getByRole('button', { name: 'Copy' })).toBeVisible()
  },
}
// Whatever comes first beside the avatar takes the centre line: the working label, the finished row, or the stopped line.
export const HiddenNameFirstRows: Story = {
  render: () => (
    <div className="grid gap-6">
      <AiMessage hideName streaming thinking={<AiThinking status="working" activity="Reading signups-sept.csv" />} />
      <AiMessage hideName thinking={<AiThinking status="done" seconds={8} />}><p>The quarter closed 4% ahead.</p></AiMessage>
      <AiMessage hideName thinking={<AiThinking status="done" seconds={8} steps={['Loaded signups-sept.csv']} />}><p>The quarter closed 4% ahead.</p></AiMessage>
      <AiMessage hideName stopped />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const [working, done, doneWithSteps, stopped] = Array.from(canvasElement.querySelectorAll<HTMLElement>('article'))
    const firstRows: Array<[HTMLElement, Element]> = [
      [working, working.querySelector('.ai-shimmer') as Element],
      [done, canvas.getByText('Thought for 8 s', { selector: 'span' })],
      [doneWithSteps, canvas.getByRole('button', { name: 'Thought for 8 s' })],
      [stopped, canvas.getByText('You stopped this answer.')],
    ]
    for (const [article, row] of firstRows) {
      await expectNameHiddenButRead(article)
      await expect(Math.abs(firstLineCentre(row) - avatarCentre(article))).toBeLessThanOrEqual(1)
    }
  },
}
// Off by default: a reply on a full chat page keeps its visible name.
export const NameShowsByDefault: Story = {
  play: async ({ canvas }) => {
    const row = canvas.getByRole('article').querySelector('[data-slot="reply-name"]') as HTMLElement
    await expect(row.getBoundingClientRect().height).toBe(28)
    await expect(canvas.getByText('Assistant')).toBeVisible()
  },
}
export const WithThinking: Story = {
  args: { thinking: <AiThinking status="done" seconds={8} steps={['Loaded signups-sept.csv', 'Compared with targets']} /> },
}
export const Streaming: Story = {
  args: { streaming: true, thinking: <AiThinking status="done" seconds={8} />, children: <p>September missed target by 12%, but July and August each beat</p> },
  play: async ({ canvas }) => {
    const article = canvas.getByRole('article')
    await expect(article).toHaveAttribute('aria-busy', 'true')
    await expect(canvas.queryByRole('button', { name: 'Copy' })).toBeNull()
    // The caret sits on the last line of text, not on a line of its own.
    const caret = article.querySelector('[data-slot="caret"]') as HTMLElement
    const para = caret.parentElement!.querySelector('p:last-of-type') as HTMLElement
    const c = caret.getBoundingClientRect(), p = para.getBoundingClientRect()
    await expect(c.top).toBeGreaterThanOrEqual(p.top - 2)
    await expect(c.bottom).toBeLessThanOrEqual(p.bottom + 2)
  },
}
export const StreamingNoAnswerYet: Story = {
  args: { streaming: true, thinking: <AiThinking status="working" />, children: undefined },
  play: async ({ canvas }) => {
    const article = canvas.getByRole('article')
    await expect(article).toHaveAttribute('aria-busy', 'true')
    // No caret beside an empty body while the AI is still thinking.
    await expect(article.querySelector('[data-slot="caret"]')).toBeNull()
  },
}
export const Stopped: Story = {
  args: { stopped: true, children: <p>September missed target by 12%, but July</p> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You stopped this answer.')).toBeVisible()
  },
}
// The status region is already on the page before the text arrives, so the text is announced rather than just appearing.
export const StoppedIsAnnounced: Story = {
  render: function Render(args) {
    const [stopped, setStopped] = React.useState(false)
    return (
      <>
        <AiMessage {...args} stopped={stopped} />
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setStopped(true)}>Stop</Button>
      </>
    )
  },
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status')
    await expect(region.textContent).toBe('')
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    await expect(canvas.getByRole('status')).toBe(region)
    await expect(region).toHaveTextContent('You stopped this answer.')
  },
}
// A real box (Safari can drop display: contents from the accessibility tree) that adds nothing while empty.
export const StatusRegionTakesNoSpaceWhileEmpty: Story = {
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('status')
    await expect(getComputedStyle(region).display).not.toBe('contents')
    await expect(getComputedStyle(region).display).not.toBe('none')
    await expect(region.getBoundingClientRect().height).toBe(0)
    const article = canvasElement.querySelector('article') as HTMLElement
    const before = article.getBoundingClientRect().height
    region.remove()
    await expect(article.getBoundingClientRect().height).toBe(before)
  },
}
export const StoppedNoAnswer: Story = {
  args: { stopped: true, children: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('You stopped this answer.')).toBeVisible()
    // Nothing was written, so there is nothing to copy.
    await expect(canvas.queryByRole('button', { name: 'Copy' })).toBeNull()
    // And no actions at all, so no empty group for a screen reader to announce.
    await expect(canvas.queryByRole('group', { name: 'Reply actions' })).toBeNull()
  },
}
export const CopyWorks: Story = {
  play: async ({ canvas }) => {
    const writeText = fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
    await expect(writeText).toHaveBeenCalledWith(expect.stringContaining('4% ahead'))
    await expect(canvas.getByRole('button', { name: 'Copied' })).toBeVisible()
  },
}
const COPIED_MS = 2000
// Records the id of every 2 s timer the component starts, so a test can see which ones it cancelled.
const watchCopiedTimers = () => {
  const setSpy = spyOn(window, 'setTimeout')
  const clearSpy = spyOn(window, 'clearTimeout')
  const copiedTimerIds = () => setSpy.mock.calls
    .map((call, index) => (call[1] === COPIED_MS ? setSpy.mock.results[index].value : undefined))
    .filter((id) => id !== undefined)
  const stop = () => { setSpy.mockRestore(); clearSpy.mockRestore() }
  return { clearSpy, copiedTimerIds, stop }
}
export const CopyTimerRestartsOnReClick: Story = {
  play: async ({ canvas }) => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: fn().mockResolvedValue(undefined) }, configurable: true })
    const { clearSpy, copiedTimerIds, stop } = watchCopiedTimers()
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
      await userEvent.click(await canvas.findByRole('button', { name: 'Copied' }))
      await waitFor(() => expect(copiedTimerIds()).toHaveLength(2))
      // The first timer must be cancelled, or it flips the label back early.
      await expect(clearSpy).toHaveBeenCalledWith(copiedTimerIds()[0])
    } finally {
      stop()
    }
  },
}
export const CopyTimerClearedOnUnmount: Story = {
  render: function Render(args) {
    const [shown, setShown] = React.useState(true)
    return (
      <>
        {shown ? <AiMessage {...args} /> : null}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShown(false)}>Remove</Button>
      </>
    )
  },
  play: async ({ canvas }) => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: fn().mockResolvedValue(undefined) }, configurable: true })
    const { clearSpy, copiedTimerIds, stop } = watchCopiedTimers()
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
      await waitFor(() => expect(copiedTimerIds()).toHaveLength(1))
      await userEvent.click(canvas.getByRole('button', { name: 'Remove' }))
      await expect(clearSpy).toHaveBeenCalledWith(copiedTimerIds()[0])
    } finally {
      stop()
    }
  },
}
// Content decides whether there is an answer, not how many children were passed.
export const EmptyAnswersCountAsNoAnswer: Story = {
  args: { streaming: false },
  render: () => (
    <div className="grid gap-4">
      <AiMessage name="Empty string">{''}</AiMessage>
      <AiMessage name="Whitespace">{'  \n '}</AiMessage>
      <AiMessage name="Empty fragment"><></></AiMessage>
      <AiMessage name="Empty paragraph"><p>{''}</p></AiMessage>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('button', { name: 'Copy' })).toBeNull()
    await expect(canvasElement.querySelector('[data-slot="reply-body"]')).toBeNull()
  },
}
// Apps usually show markdown as raw HTML, which is an element with no children.
export const RawHtmlAnswerIsAnAnswer: Story = {
  args: { children: <div dangerouslySetInnerHTML={{ __html: '<p>Hello from <strong>markdown</strong></p>' }} /> },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('markdown')).toBeVisible()
    await expect(canvasElement.querySelector('[data-slot="reply-body"]')).not.toBeNull()
    await expect(canvas.getByRole('button', { name: 'Copy' })).toBeVisible()
  },
}
export const CopyThatFinishesAfterUnmountSetsNoTimer: Story = {
  render: function Render(args) {
    const [shown, setShown] = React.useState(true)
    return (
      <>
        {shown ? <AiMessage {...args} /> : null}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShown(false)}>Remove</Button>
      </>
    )
  },
  play: async ({ canvas }) => {
    let finishCopy: () => void = () => {}
    const writeText = fn().mockImplementation(() => new Promise<void>((resolve) => { finishCopy = resolve }))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const { copiedTimerIds, stop } = watchCopiedTimers()
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
      await userEvent.click(canvas.getByRole('button', { name: 'Remove' }))
      finishCopy()
      await new Promise((resolve) => setTimeout(resolve, 100))
      // The reply is gone; a timer started now would never be cleared.
      await expect(copiedTimerIds()).toHaveLength(0)
    } finally {
      stop()
    }
  },
}
export const CaretWaitsForText: Story = {
  render: () => (
    <div className="grid gap-4">
      <AiMessage streaming name="Waiting"><p>{''}</p></AiMessage>
      <AiMessage streaming name="Writing"><p>September missed</p></AiMessage>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const [waiting, writing] = Array.from(canvasElement.querySelectorAll('article'))
    await expect(waiting.querySelector('[data-slot="caret"]')).toBeNull()
    await expect(writing.querySelector('[data-slot="caret"]')).not.toBeNull()
  },
}
export const CopyLeavesChipsOut: Story = {
  args: {
    children: (
      <>
        <p>September missed target by 12%<Citation source={{ title: 'signups-sept.csv', label: 'signups-sept' }} /> but July and August beat it<Citation source={{ title: 'Q3 board deck.pdf', label: 'Q3 deck' }} />.</p>
        <p>So the quarter closed 4% ahead.</p>
      </>
    ),
  },
  play: async ({ canvas }) => {
    const writeText = fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
    const copied = writeText.mock.calls[0][0] as string
    await expect(copied).not.toContain('signups-sept')
    await expect(copied).not.toContain('Q3 deck')
    await expect(copied.replace(/\s+/g, ' ').trim()).toBe('September missed target by 12% but July and August beat it. So the quarter closed 4% ahead.')
  },
}
export const ThumbShowsPressed: Story = {
  args: { onFeedback: fn() },
  play: async ({ canvas }) => {
    const good = canvas.getByRole('button', { name: 'Good answer' })
    const bad = canvas.getByRole('button', { name: 'Bad answer' })
    const before = getComputedStyle(good).backgroundColor
    await userEvent.click(good)
    await expect(good).toHaveAttribute('aria-pressed', 'true')
    await userEvent.unhover(good)
    // The button eases its colours, so wait for the transition to land.
    await waitFor(() => expect(getComputedStyle(good).backgroundColor).not.toBe(getComputedStyle(bad).backgroundColor))
    await expect(getComputedStyle(good).backgroundColor).not.toBe(before)
  },
}
export const CopyKeepsListItems: Story = {
  args: { children: <ul className="list-disc pl-5"><li>First item</li><li>Second item</li></ul> },
  play: async ({ canvas }) => {
    const writeText = fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
    await expect(writeText.mock.calls[0][0]).toBe('First item\nSecond item')
  },
}
export const CopyKeepsBareText: Story = {
  args: { children: <>Hello <strong>world</strong></> },
  play: async ({ canvas }) => {
    const writeText = fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
    await expect(writeText.mock.calls[0][0]).toBe('Hello world')
  },
}
export const CopyRefused: Story = {
  play: async ({ canvas }) => {
    const writeText = fn().mockRejectedValue(new Error('NotAllowedError'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    await expect(canvas.getByRole('button', { name: 'Copy' })).toBeVisible()
  },
}
export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair exampleClassName={COLUMN} usage={usage} id="answer-stays-plain"
      doExample={<AiMessage><p>The quarter closed 4% ahead.</p></AiMessage>}
      dontExample={<AiMessage><p className="ai-text font-semibold">The quarter closed 4% ahead.</p></AiMessage>} />
  ),
}

// feedbackForm is ignored until thumbs-down is pressed, and a reply without it renders exactly as before.
export const FeedbackFormWaitsForThumbsDown: Story = {
  args: { onFeedback: fn(), feedbackForm: <p>What was wrong?</p> },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByText('What was wrong?')).toBeNull()
    await expect(canvasElement.querySelector('[data-slot="reply-feedback"]')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Bad answer' }))
    await expect(canvas.getByText('What was wrong?')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Bad answer' }))
    await expect(canvas.queryByText('What was wrong?')).toBeNull()
  },
}
