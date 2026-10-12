import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BadgeOnCard as BadgeOnCardBlock } from '@registry/blocks/badge-on-card'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { usage } from '@/usage/badge-on-card.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Data / Badge on card',
  component: BadgeOnCardBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof BadgeOnCardBlock>
export default meta
type Story = StoryObj<typeof meta>

// Regression guard: destructive Badge on a card surface must pass AA contrast (was 4.45:1).
export const BadgeOnCard: Story = {
  render: () => <BadgeOnCardBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="reserve-destructive"
      doExample={
        <Card className="w-[280px]">
          <CardContent className="flex gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Overdue</Badge>
          </CardContent>
        </Card>
      }
      dontExample={
        <Card className="w-[280px]">
          <CardContent className="flex gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Featured</Badge>
          </CardContent>
        </Card>
      }
    />
  ),
}
