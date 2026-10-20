import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SplitPanel as SplitPanelBlock } from '@registry/blocks/login-split-panel'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { usage } from '@/usage/login-split-panel.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Auth / Login split panel',
  component: SplitPanelBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof SplitPanelBlock>
export default meta
type Story = StoryObj<typeof meta>

/** Official block: login with a brand side panel. */
export const SplitPanel: Story = {
  render: () => <SplitPanelBlock />,
}

export const SplitPanelDoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="panel-collapses-on-mobile"
      doExample={
        <div className="w-[280px]">
          <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col gap-1 text-center">
              <h3 className="font-heading text-base text-foreground">Welcome back</h3>
              <p className="text-xs text-muted-foreground">Sign in to your studio account.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dodont-split-do-email">Email</Label>
              <Input id="dodont-split-do-email" type="email" placeholder="you@example.com" />
            </div>
            <Button className="w-full">Sign in</Button>
          </form>
        </div>
      }
      dontExample={
        <div className="grid w-[280px] grid-cols-2 gap-2 overflow-hidden rounded-md border">
          <div className="flex flex-col justify-between bg-primary p-2 text-primary-foreground">
            <span className="font-heading text-[10px]">Quill</span>
            <p className="text-[9px] leading-heading opacity-muted">
              &ldquo;The most crafted-feeling system we&rsquo;ve shipped on.&rdquo;
            </p>
          </div>
          <form className="flex flex-col gap-1.5 p-2" onSubmit={(e) => e.preventDefault()}>
            <Label htmlFor="dodont-split-dont-email" className="text-[9px]">
              Email
            </Label>
            <Input
              id="dodont-split-dont-email"
              type="email"
              placeholder="you@example.com"
              className="h-6 text-[9px]"
            />
            <Button className="h-6 w-full text-[9px]">Sign in</Button>
          </form>
        </div>
      }
    />
  ),
}
