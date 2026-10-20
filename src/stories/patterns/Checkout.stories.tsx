import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Checkout as CheckoutBlock } from '@registry/blocks/checkout'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/checkout.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Forms / Checkout',
  component: CheckoutBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof CheckoutBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Checkout: Story = {
  render: () => <CheckoutBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="lock-icon-signals-secure-submit"
      doExample={
        <Button>
          Pay $58.00 <Icon name="lock" />
        </Button>
      }
      dontExample={<Button>Pay $58.00</Button>}
    />
  ),
}
