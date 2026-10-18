import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Navbar as NavbarBlock } from '@registry/blocks/navbar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/navbar.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Nav / Navbar',
  component: NavbarBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof NavbarBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Navbar: Story = {
  render: () => <NavbarBlock />,
}

// Plain buttons here, not the full <nav> block — that landmark wiring isn't
// the variable this pair tests, and two unlabeled <nav> regions side by side
// would itself trip the a11y gate (landmark-unique).
export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="one-primary-cta"
      doExample={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
          <Button size="sm">
            Get started <Icon name="arrow_forward" />
          </Button>
        </div>
      }
      dontExample={
        <div className="flex items-center gap-2">
          <Button size="sm">Sign in</Button>
          <Button size="sm">
            Get started <Icon name="arrow_forward" />
          </Button>
        </div>
      }
    />
  ),
}
