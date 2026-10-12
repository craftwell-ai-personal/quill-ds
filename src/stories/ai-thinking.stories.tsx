import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import { expect, userEvent, waitFor } from 'storybook/test'
import { AiThinking, formatThoughtFor } from '../../registry/lib/ai-thinking'
import { usage } from '@/usage/ai-thinking.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'
import { expectFocusRing } from './focus-ring'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-80'

const meta = {
  title: 'Components / AiThinking',
  component: AiThinking,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: renderUsageDocs(usage) } } },
  decorators: [inColumn(COLUMN)],
} satisfies Meta<typeof AiThinking>

export default meta
type Story = StoryObj<typeof meta>

const STEPS = ['Loaded signups-sept.csv, 812 rows', 'Compared each month with the targets in Q3 board deck.pdf', 'Checked what changed around 9 September']

export const Working: Story = {
  args: { status: 'working', activity: 'Reading signups-sept.csv' },
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status')
    await waitFor(() => expect(region).toHaveTextContent('Thinking'))
    await expect(region).toHaveTextContent('Reading signups-sept.csv')
  },
}
export const Done: Story = {
  args: { status: 'done', seconds: 8, steps: STEPS },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Thought for 8 s' })
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.queryByText(STEPS[0])).not.toBeVisible()
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByText(STEPS[0])).toBeVisible()
  },
}
// A status region that mounts already filled is announced unreliably; one that stays mounted and changes text is announced.
export const StatusRegionPersistsWhenDone: Story = {
  render: function Render(args) {
    const [done, setDone] = React.useState(false)
    return (
      <>
        <AiThinking {...args} status={done ? 'done' : 'working'} />
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setDone(true)}>Finish</Button>
      </>
    )
  },
  args: { status: 'working', activity: 'Reading signups-sept.csv', seconds: 8, steps: STEPS },
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status')
    await waitFor(() => expect(region).toHaveTextContent('Thinking'))
    await userEvent.click(canvas.getByRole('button', { name: 'Finish' }))
    await expect(canvas.getByRole('status')).toBe(region)
    await expect(region.isConnected).toBe(true)
    await expect(region.textContent).toBe('')
    await expect(canvas.getByRole('button', { name: 'Thought for 8 s' })).toBeVisible()
  },
}
// The region must be on the page before its text, so mounting straight into "working" paints it empty and fills it after.
export const StatusExistsBeforeItsText: Story = {
  args: { status: 'working', activity: 'Reading signups-sept.csv' },
  render: (args) => (
    <div ref={(host) => {
      // A ref runs at commit, before any timer, so this is the first paint's text.
      const region = host?.querySelector('[role="status"]')
      if (host && region && host.dataset.firstText === undefined) host.dataset.firstText = region.textContent ?? 'missing'
    }}>
      <AiThinking {...args} />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('status')
    await expect(canvasElement.querySelector('[data-first-text]')?.getAttribute('data-first-text')).toBe('')
    await waitFor(() => expect(region).toHaveTextContent('Thinking'))
    await expect(region).toHaveTextContent('Reading signups-sept.csv')
    // Sighted users see the label at once, and a screen reader hears it once: the visible copy is hidden from it.
    await expect(canvas.getByText('Thinking')).toBeVisible()
    await expect(canvas.getByText('Thinking')).toHaveAttribute('aria-hidden', 'true')
    await expect(region).toBeInTheDocument()
  },
}
export const ActivityUpdatesTheSameRegion: Story = {
  args: { status: 'working' },
  render: function Render(args) {
    const [activity, setActivity] = React.useState('Reading signups-sept.csv')
    return (
      <>
        <AiThinking {...args} activity={activity} />
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setActivity('Comparing with targets')}>Next</Button>
      </>
    )
  },
  play: async ({ canvas }) => {
    const region = canvas.getByRole('status')
    await waitFor(() => expect(region).toHaveTextContent('Reading signups-sept.csv'))
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }))
    await expect(canvas.getByRole('status')).toBe(region)
    await waitFor(() => expect(region).toHaveTextContent('Comparing with targets'))
    await expect(region).not.toHaveTextContent('Reading signups-sept.csv')
  },
}
// A real box (Safari can drop display: contents from the accessibility tree) that adds nothing to the layout.
export const StatusRegionTakesNoSpace: Story = {
  args: { status: 'done', seconds: 8 },
  play: async ({ canvas, canvasElement }) => {
    const region = canvas.getByRole('status')
    await expect(getComputedStyle(region).display).not.toBe('contents')
    await expect(getComputedStyle(region).display).not.toBe('none')
    const root = canvasElement.querySelector('[data-slot="ai-thinking"]') as HTMLElement
    const before = root.getBoundingClientRect().height
    region.remove()
    await expect(root.getBoundingClientRect().height).toBe(before)
  },
}
export const ToggleShowsFocusRing: Story = {
  args: { status: 'done', seconds: 8, steps: STEPS },
  play: async ({ canvas }) => {
    await expectFocusRing(canvas.getByRole('button', { name: 'Thought for 8 s' }))
  },
}
export const DoneWithoutSteps: Story = {
  args: { status: 'done', seconds: 98 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
    await expect(canvas.getByText('Thought for 1 min 38 s')).toBeVisible()
  },
}
export const FormatsDurations: Story = {
  args: { status: 'done' },
  play: async () => {
    await expect(formatThoughtFor(0.2)).toBe('1 s')
    await expect(formatThoughtFor(8)).toBe('8 s')
    await expect(formatThoughtFor(98)).toBe('1 min 38 s')
    await expect(formatThoughtFor(120)).toBe('2 min')
    // Negative and non-finite values land on the 1 s floor, never "NaN s" or "Infinity min".
    await expect(formatThoughtFor(-5)).toBe('1 s')
    await expect(formatThoughtFor(Number.NaN)).toBe('1 s')
    await expect(formatThoughtFor(Number.POSITIVE_INFINITY)).toBe('1 s')
  },
}
export const UnusableSecondsFallBack: Story = {
  args: { status: 'done' },
  render: () => (
    <div className="grid gap-1">
      <AiThinking status="done" seconds={Number.NaN} />
      <AiThinking status="done" seconds={Number.POSITIVE_INFINITY} />
      <AiThinking status="done" seconds={-5} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('Thought it through')).toHaveLength(3)
  },
}
export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  args: { status: 'done' },
  render: () => (
    <DoDontPair exampleClassName={COLUMN} usage={usage} id="motion-only-while-working"
      doExample={<div className="grid gap-2"><AiThinking status="done" seconds={8} steps={STEPS} /><p className="text-sm">September missed target by 12%.</p></div>}
      dontExample={<div className="grid gap-2"><AiThinking status="working" /><p className="text-sm">September missed target by 12%.</p></div>} />
  ),
}
