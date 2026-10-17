import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Notifications as NotificationsBlock } from '@registry/blocks/notifications'
import { Card, CardContent } from '@/components/ui/card'
import { Icon } from '@/components/ui/icon'
import { Separator } from '@/components/ui/separator'
import { usage } from '@/usage/notifications.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Data / Notifications',
  component: NotificationsBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof NotificationsBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Notifications: Story = {
  render: () => <NotificationsBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="icon-matches-type"
      doExample={
        <Card className="w-card">
          <CardContent className="flex flex-col gap-0 p-0">
            <div className="flex items-start gap-3 px-6 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon name="group" size={18} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">New member joined</span>
                <span className="text-sm text-muted-foreground">Grace Hopper accepted your invite.</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3 px-6 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon name="check_circle" size={18} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">Deploy succeeded</span>
                <span className="text-sm text-muted-foreground">acme-site is live in production.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      }
      dontExample={
        <Card className="w-card">
          <CardContent className="flex flex-col gap-0 p-0">
            <div className="flex items-start gap-3 px-6 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon name="notifications" size={18} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">New member joined</span>
                <span className="text-sm text-muted-foreground">Grace Hopper accepted your invite.</span>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3 px-6 py-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon name="notifications" size={18} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">Deploy succeeded</span>
                <span className="text-sm text-muted-foreground">acme-site is live in production.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    />
  ),
}
