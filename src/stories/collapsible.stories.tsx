'use client'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { useState } from 'react'
import { usage } from '@/usage/collapsible.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-72'

const meta = {
  title: 'Components / Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controlled open state' },
    defaultOpen: { control: 'boolean', description: 'Initial open state' },
    className: { table: { disable: true } },
  },
  decorators: [inColumn(COLUMN)],
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          {/* A count is data: lining figures sit on the line with the brackets (Raleway's default old-style 3 dips below it) */}
          <span className="text-sm font-medium text-ink">Repositories <span className="tabular-nums">(3)</span></span>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Toggle repositories" />}>
            <Icon name="keyboard_arrow_down" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2 space-y-1">
          <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-ds</div>
          <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-docs</div>
          <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-api</div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
}

export const DefaultOpen: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Repositories <span className="tabular-nums">(3)</span></span>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Toggle repositories" />}>
            <Icon name="keyboard_arrow_down" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2 space-y-1">
          <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-ds</div>
          <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-docs</div>
          <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-api</div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair exampleClassName={COLUMN}
      usage={usage}
      id="pair-trigger-with-icon-rotation"
      doExample={
        <Collapsible defaultOpen>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Repositories <span className="tabular-nums">(3)</span></span>
            <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Toggle repositories" />}>
              <Icon name="keyboard_arrow_down" className="rotate-180 transition-transform" />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-2 space-y-1">
            <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-ds</div>
          </CollapsibleContent>
        </Collapsible>
      }
      dontExample={
        <Collapsible defaultOpen>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-ink">Repositories <span className="tabular-nums">(3)</span></span>
            <CollapsibleTrigger render={<Button variant="ghost" size="sm" aria-label="Toggle repositories" />}>
              Toggle
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-2 space-y-1">
            <div className="text-sm text-ink-soft px-2 py-1.5 rounded-md bg-paper-deep">quill-ds</div>
          </CollapsibleContent>
        </Collapsible>
      }
    />
  ),
}
