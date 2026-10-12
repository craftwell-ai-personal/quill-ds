import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { AgentSteps, type AgentStep } from '../../registry/lib/agent-steps'
import { usage } from '@/usage/agent-steps.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'
import { compositeOver, contrastRatio, surfaceBehind } from './contrast'
import { expectFocusRing } from './focus-ring'

const STEPS: AgentStep[] = [
  { label: 'Read signups-sept.csv', status: 'done', meta: '4 s' },
  { label: 'Compared each month with targets', status: 'done', meta: '6 s', detail: 'July +3%, August +5%, September down 12%.', defaultOpen: true },
  { label: 'Drafting the summary', status: 'running' },
  { label: 'Make the chart', status: 'waiting' },
  { label: 'Email it to the growth team', status: 'waiting' },
]
const FAILED: AgentStep[] = [{ label: "Couldn't open Q2 board deck.pdf", status: 'failed' }]

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-[28rem] max-w-full'

const meta = {
  title: 'Components / AgentSteps',
  component: AgentSteps,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: renderUsageDocs(usage) } } },
  decorators: [inColumn(COLUMN)],
  args: { title: 'Preparing the September report', steps: STEPS },
} satisfies Meta<typeof AgentSteps>

export default meta
type Story = StoryObj<typeof meta>

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const centreY = (rect: DOMRect) => rect.top + rect.height / 2
// One rectangle per rendered line of the element's text.
const lineRects = (element: Element) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  return [...range.getClientRects()]
}

export const InProgress: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByRole('group', { name: 'Preparing the September report' })
    await expect(within(card).getByText('2 of 5 done')).toBeVisible()
    const rows = within(card).getAllByRole('listitem')
    await expect(rows).toHaveLength(5)
    // Every state is said in words, not only drawn.
    await expect(rows[0]).toHaveTextContent('Done: Read signups-sept.csv')
    await expect(rows[2]).toHaveTextContent('Running: Drafting the summary')
    await expect(rows[3]).toHaveTextContent('Waiting: Make the chart')
    // Done rows go muted, not struck through.
    const doneText = rows[0].querySelector('[data-slot="step-text"]') as HTMLElement
    const runningText = rows[2].querySelector('[data-slot="step-text"]') as HTMLElement
    await expect(getComputedStyle(doneText).textDecorationLine).toBe('none')
    await expect(getComputedStyle(doneText).color).not.toBe(getComputedStyle(runningText).color)
    // Only the row with detail is a button; it opens and closes on a press.
    await expect(within(card).getAllByRole('button')).toHaveLength(1)
    const toggle = within(card).getByRole('button', { name: /Compared each month with targets/ })
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(within(card).getByText(/July \+3%/)).toBeVisible()
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(within(card).getByText(/July \+3%/)).not.toBeVisible()
  },
}

export const Failed: Story = {
  args: { title: 'Preparing the September report', steps: FAILED, onRetry: fn() },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('listitem')).toHaveTextContent("Failed: Couldn't open Q2 board deck.pdf")
    const retry = canvas.getByRole('button', { name: "Retry: Couldn't open Q2 board deck.pdf" })
    await expect(retry).toHaveTextContent('Retry')
    await userEvent.click(retry)
    await expect(args.onRetry).toHaveBeenCalledWith(0)
    await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent("Failed: Couldn't open Q2 board deck.pdf. 0 of 1 done"))
  },
}

// No callback, no button: a Retry that does nothing is worse than none.
export const FailedWithoutRetry: Story = {
  args: { steps: FAILED },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
  },
}

// The region must be on the page before its text, so the first paint leaves it empty.
export const StatusExistsBeforeItsText: Story = {
  render: (args) => (
    <div ref={(host) => {
      // A ref runs at commit, before any timer, so this is the first paint's text.
      const region = host?.querySelector('[role="status"]')
      if (host && region && host.dataset.firstText === undefined) host.dataset.firstText = region.textContent ?? 'missing'
    }}>
      <AgentSteps {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('status')
    await expect(canvasElement.querySelector('[data-first-text]')?.getAttribute('data-first-text')).toBe('')
    await waitFor(() => expect(region).toHaveTextContent('Running: Drafting the summary. 2 of 5 done'))
    // One copy for a screen reader: while the region speaks, the visible count is hidden from it.
    await expect(canvas.getByText('2 of 5 done')).toHaveAttribute('aria-hidden', 'true')
    // A real box that adds nothing to the layout.
    await expect(getComputedStyle(region).display).not.toBe('contents')
    await expect(getComputedStyle(region).display).not.toBe('none')
    const card = canvasElement.querySelector('[data-slot="agent-steps"]') as HTMLElement
    const before = card.getBoundingClientRect().height
    region.remove()
    await expect(card.getBoundingClientRect().height).toBe(before)
  },
}

export const AnnouncesProgress: Story = {
  render: function Render(args) {
    const [steps, setSteps] = React.useState(args.steps)
    const advance = () => setSteps((all) => all.map((step, index) => (
      index === 2 ? { ...step, status: 'done', meta: '9 s' } : index === 3 ? { ...step, status: 'running' } : step
    )))
    return (
      <div className="grid gap-3">
        <AgentSteps {...args} steps={steps} />
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={advance}>Finish the running step</Button>
      </div>
    )
  },
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status')
    await waitFor(() => expect(region).toHaveTextContent('Running: Drafting the summary. 2 of 5 done'))
    await userEvent.click(canvas.getByRole('button', { name: 'Finish the running step' }))
    // The same region, new text: that is what a screen reader announces.
    await expect(canvas.getByRole('status')).toBe(region)
    await waitFor(() => expect(region).toHaveTextContent('Running: Make the chart. 3 of 5 done'))
    await expect(canvas.getByText('3 of 5 done')).toBeVisible()
  },
}

// A finished list restored from history must not announce itself.
export const FinishedListStaysQuiet: Story = {
  args: { steps: [{ label: 'Read signups-sept.csv', status: 'done', meta: '4 s' }, { label: 'Made the chart', status: 'done', meta: '7 s' }] },
  play: async ({ canvas }) => {
    await pause(300)
    await expect(canvas.getByRole('status').textContent).toBe('')
    await expect(canvas.getByText('2 of 2 done')).not.toHaveAttribute('aria-hidden')
  },
}

export const NoStepsRendersNothing: Story = {
  args: { steps: [] },
  render: (args) => <div data-testid="host"><AgentSteps {...args} /></div>,
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('host')).toBeEmptyDOMElement()
  },
}

// Two steps may share a label; a status this version does not know reads as waiting.
export const RepeatedLabelsAndUnknownStatus: Story = {
  args: {
    steps: [
      { label: 'Checked the numbers', status: 'done', detail: 'First pass.' },
      { label: 'Checked the numbers', status: 'done', detail: 'Second pass.' },
      { label: 'Publish', status: 'paused' as AgentStep['status'] },
    ],
  },
  play: async ({ canvas }) => {
    const toggles = canvas.getAllByRole('button', { name: /Checked the numbers/ })
    await expect(toggles).toHaveLength(2)
    await userEvent.click(toggles[0])
    await expect(toggles[0]).toHaveAttribute('aria-expanded', 'true')
    await expect(toggles[1]).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.getByText('First pass.')).toBeVisible()
    await expect(canvas.getByText('Second pass.')).not.toBeVisible()
    await expect(canvas.getAllByRole('listitem')[2]).toHaveTextContent('Waiting: Publish')
  },
}

// A long label wraps; its dot must sit on the first line, not in the middle of the block.
export const DotSitsOnTheFirstLine: Story = {
  args: {
    steps: [
      { label: 'Compared each month of the quarter with the targets in the board deck and the finance sheet', status: 'done' },
      { label: 'Drafting the summary for the growth team and for leadership, with the chart attached', status: 'running' },
      { label: 'Email the finished report to everyone who asked for it last month', status: 'waiting' },
    ],
  },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
  play: async ({ canvasElement }) => {
    for (const row of canvasElement.querySelectorAll('li')) {
      const lines = lineRects(row.querySelector('[data-slot="step-text"]') as HTMLElement)
      await expect(lines.length).toBeGreaterThan(1)
      const dot = (row.querySelector('[data-slot="step-dot"]') as HTMLElement).firstElementChild as HTMLElement
      await expect(Math.abs(centreY(dot.getBoundingClientRect()) - centreY(lines[0]))).toBeLessThanOrEqual(1)
    }
  },
}

export const RowShowsFocusRing: Story = {
  play: async ({ canvas }) => {
    await expectFocusRing(canvas.getByRole('button', { name: /Compared each month with targets/ }))
  },
}

// A tick, a cross, a ring and a spinner each have to read as a shape on the card in every theme (WCAG 1.4.11, 3:1).
export const DotsReadAsShapes: Story = {
  args: { steps: [...STEPS, ...FAILED] },
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector('[data-slot="agent-steps"]') as HTMLElement
    const surface = compositeOver(getComputedStyle(card).backgroundColor, `rgb(${surfaceBehind(card).join(' ')})`)
    const onSurface = `rgb(${surface.join(' ')})`
    const dot = (status: string) => (canvasElement.querySelector(`[data-slot="step-dot"][data-status="${status}"]`) as HTMLElement).firstElementChild as HTMLElement
    for (const status of ['done', 'failed']) {
      const fill = compositeOver(getComputedStyle(dot(status)).backgroundColor, onSurface)
      const glyph = compositeOver(getComputedStyle(dot(status)).color, `rgb(${fill.join(' ')})`)
      console.log(`agent-steps ${status}: dot ${contrastRatio(fill, surface).toFixed(2)}:1, glyph ${contrastRatio(glyph, fill).toFixed(2)}:1`)
      await expect(contrastRatio(fill, surface)).toBeGreaterThanOrEqual(3)
      await expect(contrastRatio(glyph, fill)).toBeGreaterThanOrEqual(3)
    }
    const ring = compositeOver(getComputedStyle(dot('waiting')).borderTopColor, onSurface)
    const spinner = compositeOver(getComputedStyle(dot('running')).color, onSurface)
    console.log(`agent-steps waiting ring ${contrastRatio(ring, surface).toFixed(2)}:1, spinner ${contrastRatio(spinner, surface).toFixed(2)}:1`)
    await expect(contrastRatio(ring, surface)).toBeGreaterThanOrEqual(3)
    await expect(contrastRatio(spinner, surface)).toBeGreaterThanOrEqual(3)
  },
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: (args) => (
    <DoDontPair exampleClassName={COLUMN} usage={usage} id="progress-stays-moss"
      doExample={<AgentSteps {...args} steps={STEPS.slice(0, 3)} />}
      dontExample={<div className="grid gap-2 rounded-xl border border-border bg-card px-4 py-3.5 text-sm"><p className="ai-text font-semibold">2 of 5 done</p><span className="ai-line" /></div>} />
  ),
}
