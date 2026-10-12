import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ExampleMarketingPage } from '@registry/examples/example-marketing-page'
import { exampleByName, renderExampleDocs } from '@/usage/examples.mjs'
import { usage } from '@/usage/example-marketing-page.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'

const meta = {
  title: 'Examples / Marketing page',
  component: ExampleMarketingPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // the guide (when to use it, rules, accessibility), then the install docs (order and spacing)
    docs: { description: { component: [renderUsageDocs(usage), renderExampleDocs(exampleByName('example-marketing-page'))].join('\n\n') } },
  },
} satisfies Meta<typeof ExampleMarketingPage>
export default meta
type Story = StoryObj<typeof meta>

export const MarketingPage: Story = {}
