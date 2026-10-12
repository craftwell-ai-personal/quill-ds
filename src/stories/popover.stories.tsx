import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { usage } from '@/usage/popover.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from './DoDont'

const meta = {
  title: 'Components / Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controlled open state' },
  },
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Open popover</Button>} />
      <PopoverContent>
        <div className="flex flex-col gap-3">
          <PopoverHeader>
            <PopoverTitle className="font-heading">Quick settings</PopoverTitle>
          </PopoverHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pop-name">Display name</Label>
            <Input id="pop-name" placeholder="Your name" />
          </div>
          <Button size="sm" className="w-full">Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline">Rename workspace</Button>} />
      <PopoverContent>
        <div className="flex flex-col gap-3">
          <PopoverHeader>
            <PopoverTitle className="font-heading">Rename workspace</PopoverTitle>
            <PopoverDescription>This name is visible to all members.</PopoverDescription>
          </PopoverHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pop-workspace">Workspace name</Label>
            <Input id="pop-workspace" placeholder="e.g. Design team" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">Save</Button>
            <Button size="sm" variant="ghost" className="flex-1">Cancel</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const AllSides: Story = {
  parameters: { layout: 'centered' },
  render: () => (
    <div className="grid grid-cols-2 gap-16 p-24">
      {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="outline" className="w-32 capitalize">{side}</Button>} />
          <PopoverContent side={side}>
            <PopoverHeader>
              <PopoverTitle className="font-heading">Opens {side}</PopoverTitle>
              <PopoverDescription>Positioned to the {side} of the trigger.</PopoverDescription>
            </PopoverHeader>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true }, a11y: { test: 'off' } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="title-for-context"
      doExample={
        // pb-28 reserves room below the trigger for the defaultOpen popover
        // (portal-rendered, positioned by floating-ui) so it doesn't cover
        // the figcaption underneath or bleed past the card's own border.
        <div className="flex justify-center pb-28">
          <Popover defaultOpen>
            <PopoverTrigger render={<Button variant="outline">Rename workspace</Button>} />
            <PopoverContent>
              <div className="flex flex-col gap-3">
                <PopoverHeader>
                  <PopoverTitle className="font-heading">Rename workspace</PopoverTitle>
                </PopoverHeader>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pop-do-name">Workspace name</Label>
                  <Input id="pop-do-name" placeholder="e.g. Design team" />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      }
      dontExample={
        <div className="flex justify-center pb-28">
          <Popover defaultOpen>
            <PopoverTrigger render={<Button variant="outline">Rename workspace</Button>} />
            <PopoverContent>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pop-dont-name">Workspace name</Label>
                <Input id="pop-dont-name" placeholder="e.g. Design team" />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      }
    />
  ),
}
