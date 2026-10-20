import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Dashboard as DashboardBlock } from '@registry/blocks/dashboard'
import { expect } from 'storybook/test'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/dashboard.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Shells / Dashboard',
  component: DashboardBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof DashboardBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Dashboard: Story = {
  render: () => <DashboardBlock />,
  play: async ({ canvasElement }) => {
    const wrapper = canvasElement.querySelector('[data-theme]')
    if (!wrapper) throw new Error('themed wrapper not found')
    expect(wrapper.getBoundingClientRect().height).toBeGreaterThanOrEqual(window.innerHeight)
  },
}

// Plain <div> nav rows here, not the full <aside> shell — that landmark
// wiring isn't the variable this pair tests.
export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="mark-the-active-section"
      doExample={
        <div className="flex w-44 flex-col gap-1 rounded-lg border border-border bg-sidebar p-2">
          <button className="flex items-center gap-2.5 rounded-lg bg-accent px-2.5 py-2 text-left text-sm text-accent-foreground">
            <Icon name="dashboard" className="size-icon-lg" />
            Overview
          </button>
          <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground">
            <Icon name="folder_open" className="size-icon-lg" />
            Projects
          </button>
        </div>
      }
      dontExample={
        <div className="flex w-44 flex-col gap-1 rounded-lg border border-border bg-sidebar p-2">
          <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground">
            <Icon name="dashboard" className="size-icon-lg" />
            Overview
          </button>
          <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground">
            <Icon name="folder_open" className="size-icon-lg" />
            Projects
          </button>
        </div>
      }
    />
  ),
}
