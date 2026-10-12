import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/tooltip.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from './DoDont'

const meta = {
  title: 'Components / Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {},
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
      <TooltipContent>Save your progress</TooltipContent>
    </Tooltip>
  ),
}

export const IconTrigger: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={
          <button className="rounded-full p-1 text-ink-muted hover:text-ink" aria-label="More information">
            <Icon name="info" className="size-4" />
          </button>
        }
      />
      <TooltipContent>This course is recommended for beginners.</TooltipContent>
    </Tooltip>
  ),
}

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex items-center gap-4">
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger render={<Button variant="outline" size="sm">{side}</Button>} />
          <TooltipContent side={side}>Tooltip on {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true }, a11y: { test: 'off' } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="tooltip-is-supplementary"
      doExample={
        // pt-8 reserves room above the trigger for the defaultOpen tooltip, and the trigger is centred so the tooltip,
        // centred on it, stays inside the frame instead of hanging off its left edge.
        // (portal-rendered above the trigger by default, positioned by
        // floating-ui) so it doesn't spill past the card's own top border.
        <div className="flex justify-center pt-8">
          <Tooltip defaultOpen>
            <TooltipTrigger render={<Button variant="outline">Save</Button>} />
            <TooltipContent>Save your progress to the cloud</TooltipContent>
          </Tooltip>
        </div>
      }
      dontExample={
        <div className="flex justify-center pt-8">
          <Tooltip defaultOpen>
            <TooltipTrigger
              render={
                <button className="rounded-full p-1 text-ink-muted hover:text-ink">
                  <Icon name="save" className="size-4" />
                </button>
              }
            />
            <TooltipContent>Save your progress to the cloud</TooltipContent>
          </Tooltip>
        </div>
      }
    />
  ),
}
