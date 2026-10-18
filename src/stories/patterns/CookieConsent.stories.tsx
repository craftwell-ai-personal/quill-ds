import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CookieConsent as CookieConsentBlock } from '@registry/blocks/cookie-consent'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/cookie-consent.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / State / Cookie consent',
  component: CookieConsentBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof CookieConsentBlock>
export default meta
type Story = StoryObj<typeof meta>

export const CookieConsent: Story = {
  render: () => <CookieConsentBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="reject-is-equally-easy"
      doExample={
        <div className="flex w-[300px] items-start gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 text-foreground shadow-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="info" className="size-icon-lg" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              We use cookies to run Quill and, with your consent, to improve it.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Accept all</Button>
              <Button size="sm" variant="outline">
                Reject non-essential
              </Button>
            </div>
          </div>
        </div>
      }
      dontExample={
        <div className="flex w-[300px] items-start gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4 text-foreground shadow-sm">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon name="info" className="size-icon-lg" />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              We use cookies to run Quill and, with your consent, to improve it.
            </p>
            <div className="flex items-center gap-3">
              <Button size="sm">Accept all</Button>
              <Button size="sm" variant="link">
                Manage preferences
              </Button>
            </div>
          </div>
        </div>
      }
    />
  ),
}
