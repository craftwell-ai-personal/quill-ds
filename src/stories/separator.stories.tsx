import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Separator } from '@/components/ui/separator'
import { usage } from '@/usage/separator.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-64'

const meta = {
  title: 'Components / Separator',
  component: Separator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Divider direction',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    className: { table: { disable: true } },
  },
  decorators: [inColumn(COLUMN)],
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">Watercolor</p>
      <Separator />
      <p className="text-sm font-medium text-ink">Calligraphy</p>
    </div>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">Watercolor</p>
      <Separator />
      <p className="text-sm font-medium text-ink">Calligraphy</p>
      <Separator />
      <p className="text-sm font-medium text-ink">Pottery</p>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex items-center gap-3 text-sm text-ink-soft">
      <span>Edit</span>
      <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
      <span>Preview</span>
      <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
      <span>Share</span>
    </div>
  ),
}

// The separator stretches by default (self-stretch); with a fixed h-4 that pins it to the top of the row, so data-vertical:self-center (a plain self-center loses to the data-vertical variant).
export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6 w-64">
      <div>
        <p className="text-xs text-ink-muted mb-3">Horizontal</p>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-ink-soft">Above</span>
          <Separator />
          <span className="text-sm text-ink-soft">Below</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-3">Vertical (in toolbar)</p>
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <span>Cut</span>
          <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
          <span>Copy</span>
          <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
          <span>Paste</span>
        </div>
      </div>
    </div>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair exampleClassName={COLUMN}
      usage={usage}
      id="vertical-needs-flex-ancestor"
      doExample={
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>Edit</span>
          <Separator orientation="vertical" className="h-4 data-vertical:self-center" />
          <span>Preview</span>
        </div>
      }
      dontExample={
        <div className="items-center gap-3 text-sm text-ink-soft">
          <span>Edit</span>
          <Separator orientation="vertical" />
          <span>Preview</span>
        </div>
      }
    />
  ),
}
