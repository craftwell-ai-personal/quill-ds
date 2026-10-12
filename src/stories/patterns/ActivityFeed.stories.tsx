import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ActivityFeed as ActivityFeedBlock } from '@registry/blocks/activity-feed'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { usage } from '@/usage/activity-feed.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Data / Activity feed',
  component: ActivityFeedBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof ActivityFeedBlock>
export default meta
type Story = StoryObj<typeof meta>

export const ActivityFeed: Story = {
  render: () => <ActivityFeedBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="time-is-relative"
      doExample={
        <Card className="w-[320px]">
          <CardContent>
            <ol className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Ada Lovelace</span>{' '}
                    <span className="text-muted-foreground">published</span>{' '}
                    <span className="font-medium text-foreground">The Brief · 004</span>
                  </p>
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">John Doe</span>{' '}
                    <span className="text-muted-foreground">commented on</span>{' '}
                    <span className="font-medium text-foreground">Discovery findings</span>
                  </p>
                  <span className="text-xs text-muted-foreground">Yesterday</span>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      }
      dontExample={
        <Card className="w-[320px]">
          <CardContent>
            <ol className="flex flex-col gap-4">
              <li className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>AL</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">Ada Lovelace</span>{' '}
                    <span className="text-muted-foreground">published</span>{' '}
                    <span className="font-medium text-foreground">The Brief · 004</span>
                  </p>
                  <span className="text-xs text-muted-foreground">July 12, 2026, 9:14 AM</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Avatar>
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm">
                    <span className="font-medium text-foreground">John Doe</span>{' '}
                    <span className="text-muted-foreground">commented on</span>{' '}
                    <span className="font-medium text-foreground">Discovery findings</span>
                  </p>
                  <span className="text-xs text-muted-foreground">July 11, 2026, 3:00 PM</span>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      }
    />
  ),
}
