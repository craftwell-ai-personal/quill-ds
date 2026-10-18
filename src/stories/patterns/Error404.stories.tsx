import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Error404 as Error404Block } from '@registry/blocks/error-404'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/error-404.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / State / Error 404',
  component: Error404Block,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof Error404Block>
export default meta
type Story = StoryObj<typeof meta>

export const Error404: Story = {
  render: () => <Error404Block />,
}

// Plain <p> heading text here, not the full-page <h1> — this pair isolates
// the recovery-actions row, not the page's heading structure.
export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="always-offer-two-ways-out"
      doExample={
        <div className="flex w-72 flex-col items-center gap-4 rounded-xl border border-border bg-background p-6 text-center text-foreground">
          <span className="font-heading text-4xl text-muted-foreground">
            404
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xl font-medium">Page not found</p>
            <p className="text-sm text-muted-foreground">
              The page you’re looking for doesn’t exist or may have been moved.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Icon name="arrow_forward" className="rotate-180" /> Go back
            </Button>
            <Button size="sm">Take me home</Button>
          </div>
        </div>
      }
      dontExample={
        <div className="flex w-72 flex-col items-center gap-4 rounded-xl border border-border bg-background p-6 text-center text-foreground">
          <span className="font-heading text-4xl text-muted-foreground">
            404
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xl font-medium">Page not found</p>
            <p className="text-sm text-muted-foreground">
              The page you’re looking for doesn’t exist or may have been moved.
            </p>
          </div>
        </div>
      }
    />
  ),
}
