import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Minimal as MinimalBlock } from '@registry/blocks/login-minimal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { usage } from '@/usage/login-minimal.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Auth / Login minimal',
  component: MinimalBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof MinimalBlock>
export default meta
type Story = StoryObj<typeof meta>

/** Official block: bare, centered login — no card chrome. */
export const Minimal: Story = {
  render: () => <MinimalBlock />,
}

export const MinimalDoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="no-card-chrome"
      doExample={
        <form className="flex w-[280px] flex-col items-center gap-4" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
              Q
            </span>
            <h3 className="font-heading text-lg text-foreground">Sign in to Quill</h3>
          </div>
          <div className="flex w-full flex-col gap-1.5">
            <Label htmlFor="dodont-minimal-do-email">Email</Label>
            <Input id="dodont-minimal-do-email" type="email" placeholder="you@example.com" />
          </div>
          <Button className="w-full">Continue</Button>
        </form>
      }
      dontExample={
        <div className="relative isolate flex h-[320px] w-[320px] items-center justify-center overflow-hidden rounded-md">
          <div
            aria-hidden
            className="absolute inset-0 -z-raised grid grid-cols-5 grid-rows-5 gap-1 p-1"
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                className={
                  i % 3 === 0 ? 'rounded bg-primary/50' : i % 3 === 1 ? 'rounded bg-accent/60' : 'rounded bg-muted'
                }
              />
            ))}
          </div>
          <form className="flex w-[220px] flex-col items-center gap-4" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
                Q
              </span>
              <h3 className="font-heading text-lg text-foreground">Sign in to Quill</h3>
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <Label htmlFor="dodont-minimal-dont-email">Email</Label>
              <Input id="dodont-minimal-dont-email" type="email" placeholder="you@example.com" />
            </div>
            <Button className="w-full">Continue</Button>
          </form>
        </div>
      }
    />
  ),
}
