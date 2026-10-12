import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ExampleAppPage } from '@registry/examples/example-app-page'
import { exampleByName, renderExampleDocs } from '@/usage/examples.mjs'
import { usage } from '@/usage/example-app-page.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'

const meta = {
  title: 'Examples / App page',
  component: ExampleAppPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // the guide (when to use it, rules, accessibility), then the install docs (order and spacing)
    docs: { description: { component: [renderUsageDocs(usage), renderExampleDocs(exampleByName('example-app-page'))].join('\n\n') } },
  },
} satisfies Meta<typeof ExampleAppPage>
export default meta
type Story = StoryObj<typeof meta>

export const AppPage: Story = {}
