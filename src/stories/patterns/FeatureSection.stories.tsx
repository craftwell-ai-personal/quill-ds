import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FeatureSection as FeatureSectionBlock } from '@registry/blocks/feature-section'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/feature-section.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Marketing / Feature section',
  component: FeatureSectionBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof FeatureSectionBlock>
export default meta
type Story = StoryObj<typeof meta>

export const FeatureSection: Story = {
  render: () => <FeatureSectionBlock />,
}

function FeatureTile({ icon, title }: { icon: 'palette' | 'dashboard' | 'check_circle' | 'bolt'; title: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-primary">
        <Icon name={icon} className="size-icon-lg" />
      </div>
      <span className="text-xs font-medium">{title}</span>
    </div>
  )
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="three-is-the-target"
      doExample={
        <div className="grid w-[320px] grid-cols-3 gap-3">
          <FeatureTile icon="palette" title="Tokens" />
          <FeatureTile icon="dashboard" title="Composable" />
          <FeatureTile icon="check_circle" title="Accessible" />
        </div>
      }
      dontExample={
        <div className="grid w-[320px] grid-cols-3 gap-3">
          <FeatureTile icon="palette" title="Tokens" />
          <FeatureTile icon="dashboard" title="Composable" />
          <FeatureTile icon="check_circle" title="Accessible" />
          <FeatureTile icon="bolt" title="Fast" />
        </div>
      }
    />
  ),
}
