import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Icon } from '@/components/ui/icon'
import { icons } from '@/components/ui/icons.core.mjs'
import type { IconName } from '@/components/ui/icons.generated'
import { usage } from '@/usage/icon.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'

// The core set: what the `icon` registry item ships to apps. The site's <Icon>
// can lazy-load the whole Material library, but a consumer app has only these.
const coreNames = Object.keys(icons).sort() as IconName[]

const meta = {
  title: 'Components / Icon',
  component: Icon,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    name: { control: 'select', options: coreNames, description: 'A core-set name — the names that ship to apps' },
    size: { control: 'number', description: 'Pixels; defaults to 1em so it follows the text' },
    'aria-label': { control: 'text', description: 'Set only when the icon stands alone; it becomes role="img"' },
  },
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { args: { name: 'check', size: 24 } }

export const InlineWithText: Story = {
  args: { name: 'check' },
  render: (args) => (
    <p className="text-sm text-foreground">
      Saved <Icon {...args} /> to your library
    </p>
  ),
}

export const Labelled: Story = { args: { name: 'search', size: 20, 'aria-label': 'Search' } }

export const CoreSet: Story = {
  args: { name: 'check' },
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <div className="grid grid-cols-4 gap-x-6 gap-y-5 sm:grid-cols-6 lg:grid-cols-8">
      {coreNames.map((name) => (
        <figure key={name} className="m-0 flex flex-col items-center gap-1.5 text-center">
          <Icon name={name} size={22} />
          {/* Break only after an underscore: break-all split names mid-word ("check_box_outline_b / lank"). */}
          <figcaption className="font-mono text-2xs text-muted-foreground break-words">
            {name.split('_').map((part, index) => (index ? <React.Fragment key={index}>_<wbr />{part}</React.Fragment> : part))}
          </figcaption>
        </figure>
      ))}
    </div>
  ),
}
