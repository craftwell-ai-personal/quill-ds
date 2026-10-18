import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect } from 'storybook/test'
import { AiMark } from '../../registry/lib/ai-mark'
import { usage } from '@/usage/ai-mark.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from './DoDont'
import { Icon } from '@/components/ui/icon'

const meta = {
  title: 'Components / AiMark',
  component: AiMark,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: renderUsageDocs(usage) } } },
  argTypes: {
    size: { control: { type: 'number', min: 12, max: 64 }, description: 'px; 16 and under draws the one-star cut', table: { defaultValue: { summary: '18' } } },
    label: { control: 'text', description: 'Accessible name when the mark stands alone' },
  },
} satisfies Meta<typeof AiMark>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: {} }

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      {(['icon-xs', 'icon-md', 'icon-lg', 'icon-2xl', 'icon-3xl'] as const).map((s) => <AiMark key={s} size={s} />)}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const svgs = canvasElement.querySelectorAll('svg')
    await expect(svgs[0].querySelectorAll('path').length).toBe(1) // icon-xs, 12px: one star
    await expect(svgs[1].querySelectorAll('path').length).toBe(1) // icon-md, 16px: one star
    await expect(svgs[2].querySelectorAll('path').length).toBe(2) // icon-lg, 18px: two stars
    await expect(svgs[1].getBoundingClientRect().width).toBe(16) // the step sets the size shown
    const ids = [...canvasElement.querySelectorAll('linearGradient')].map((g) => g.id)
    await expect(new Set(ids).size).toBe(ids.length) // review focus 1: unique per instance
  },
}

export const Labelled: Story = {
  args: { label: 'AI assistant', size: 'icon-2xl' },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg')!
    await expect(svg.getAttribute('role')).toBe('img')
    await expect(svg.getAttribute('aria-label')).toBe('AI assistant')
  },
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="grid gap-6">
      <DoDontPair usage={usage} id="mark-only-means-ai"
        doExample={<span className="inline-flex items-center gap-1.5 text-sm"><AiMark size="icon-lg" />Summarize</span>}
        dontExample={<span className="inline-flex items-center gap-1.5 text-sm"><AiMark size="icon-lg" />New in October</span>} />
      <DoDontPair usage={usage} id="mark-keeps-its-gradient"
        doExample={<AiMark size="icon-2xl" />}
        dontExample={<Icon name="star" className="size-icon-2xl text-terracotta" />} />
    </div>
  ),
}
