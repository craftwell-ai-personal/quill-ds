import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ExampleAuthPage } from '@registry/examples/example-auth-page'
import { exampleByName, renderExampleDocs } from '@/usage/examples.mjs'
import { usage } from '@/usage/example-auth-page.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'

const meta = {
  title: 'Examples / Auth page',
  component: ExampleAuthPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    // the guide (when to use it, rules, accessibility), then the install docs (order and spacing)
    docs: { description: { component: [renderUsageDocs(usage), renderExampleDocs(exampleByName('example-auth-page'))].join('\n\n') } },
  },
} satisfies Meta<typeof ExampleAuthPage>
export default meta
type Story = StoryObj<typeof meta>

export const AuthPage: Story = {}
