import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Alerts as AlertsBlock } from '@registry/blocks/alerts'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/alerts.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / State / Alerts',
  component: AlertsBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof AlertsBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Alerts: Story = {
  render: () => <AlertsBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="severity-matches-consequence"
      doExample={
        <Alert variant="destructive">
          <Icon name="warning" />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>We couldn’t process your card. Update your billing details.</AlertDescription>
        </Alert>
      }
      dontExample={
        <Alert variant="destructive">
          <Icon name="info" />
          <AlertTitle>New course available</AlertTitle>
          <AlertDescription>Check out our latest workshop on typography fundamentals.</AlertDescription>
        </Alert>
      }
    />
  ),
}
