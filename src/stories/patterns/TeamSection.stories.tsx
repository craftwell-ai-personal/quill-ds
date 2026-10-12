import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TeamSection as TeamSectionBlock } from '@registry/blocks/team-section'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/team-section.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Marketing / Team section',
  component: TeamSectionBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof TeamSectionBlock>
export default meta
type Story = StoryObj<typeof meta>

export const TeamSection: Story = {
  render: () => <TeamSectionBlock />,
}

function TeamCard({ initials, name, showAction }: { initials: string; name: string; showAction: boolean }) {
  return (
    <Card size="sm" className="w-[110px]">
      <CardContent className="flex flex-col items-center gap-2 text-center">
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-foreground">{name}</span>
        {showAction && (
          <Button variant="ghost" size="icon-xs" aria-label={`Email ${name}`}>
            <Icon name="mail" size={14} />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="contact-action-is-per-person"
      doExample={
        <div className="flex gap-3">
          <TeamCard initials="AL" name="Ada Lovelace" showAction />
          <TeamCard initials="NO" name="Nadia Okonjo" showAction />
        </div>
      }
      dontExample={
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <TeamCard initials="AL" name="Ada Lovelace" showAction={false} />
            <TeamCard initials="NO" name="Nadia Okonjo" showAction={false} />
          </div>
          <Button variant="outline" size="sm">
            Contact us
          </Button>
        </div>
      }
    />
  ),
}
