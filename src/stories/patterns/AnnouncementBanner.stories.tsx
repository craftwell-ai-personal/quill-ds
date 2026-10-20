import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AnnouncementBanner as AnnouncementBannerBlock } from '@registry/blocks/announcement-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/announcement-banner.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Marketing / Announcement banner',
  component: AnnouncementBannerBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof AnnouncementBannerBlock>
export default meta
type Story = StoryObj<typeof meta>

export const AnnouncementBanner: Story = {
  render: () => <AnnouncementBannerBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="always-dismissible"
      doExample={
        <div className="flex w-[320px] items-center justify-between gap-4 rounded-lg bg-card ring-1 ring-foreground/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Badge>New</Badge>
            <p className="text-sm text-foreground">Issue 004 of The Brief just shipped.</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Dismiss announcement">
            <Icon name="close" />
          </Button>
        </div>
      }
      dontExample={
        <div className="flex w-[320px] items-center justify-between gap-4 rounded-lg bg-card ring-1 ring-foreground/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Badge>New</Badge>
            <p className="text-sm text-foreground">Issue 004 of The Brief just shipped.</p>
          </div>
        </div>
      }
    />
  ),
}
