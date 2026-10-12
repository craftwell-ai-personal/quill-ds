import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { usage } from '@/usage/accordion.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-80'

const meta = {
  title: 'Components / Accordion',
  component: Accordion,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    multiple: {
      control: 'boolean',
      description: 'Allow multiple items open simultaneously',
      table: { defaultValue: { summary: 'false' } },
    },
    className: { table: { disable: true } },
  },
  decorators: [inColumn(COLUMN)],
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <Accordion {...args}>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Quill?</AccordionTrigger>
        <AccordionContent>
          Quill is a calm, editorial design system for building interfaces by hand.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>What fonts does it use?</AccordionTrigger>
        <AccordionContent>
          Fraunces for display and editorial moments; Raleway for interface text.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is there a dark mode?</AccordionTrigger>
        <AccordionContent>
          Components support a `.dark` class for consumer dark surfaces, though Quill itself publishes in light mode.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const DefaultOpen: Story = {
  render: () => (
    <Accordion defaultValue={['item-1']}>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Quill?</AccordionTrigger>
        <AccordionContent>
          Quill is a calm, editorial design system for building interfaces by hand.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>What fonts does it use?</AccordionTrigger>
        <AccordionContent>
          Fraunces for display and editorial moments; Raleway for interface text.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is there a dark mode?</AccordionTrigger>
        <AccordionContent>
          Components support a `.dark` class for consumer dark surfaces, though Quill itself publishes in light mode.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const MultipleOpen: Story = {
  render: () => (
    <Accordion multiple defaultValue={['a', 'b']}>
      <AccordionItem value="a">
        <AccordionTrigger>What is Quill?</AccordionTrigger>
        <AccordionContent>
          Quill is a calm, editorial design system for building interfaces by hand.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>What fonts does it use?</AccordionTrigger>
        <AccordionContent>
          Fraunces for display and editorial moments; Raleway for interface text.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="c">
        <AccordionTrigger>Is there a dark mode?</AccordionTrigger>
        <AccordionContent>
          Components support a `.dark` class for consumer dark surfaces, though Quill itself publishes in light mode.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const Dark: Story = {
  parameters: { globals: { theme: 'dark' } },
  render: () => (
    <Accordion>
      <AccordionItem value="item-1">
        <AccordionTrigger>What is Quill?</AccordionTrigger>
        <AccordionContent>
          Quill is a calm, editorial design system for building interfaces by hand.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>What fonts does it use?</AccordionTrigger>
        <AccordionContent>
          Fraunces for display and editorial moments; Raleway for interface text.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair exampleClassName={COLUMN}
      usage={usage}
      id="trigger-stays-light-on-hover"
      doExample={
        <Accordion>
          <AccordionItem value="item-1">
            <AccordionTrigger>What is Quill?</AccordionTrigger>
            <AccordionContent>
              Quill is a calm, editorial design system for building interfaces by hand.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is there a dark mode?</AccordionTrigger>
            <AccordionContent>
              Components support a .dark class for consumer dark surfaces.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      }
      dontExample={
        <Accordion>
          <AccordionItem value="item-1">
            {/* Frozen into its "as-if-hovered" state (bg-paper-deep, no-underline
                applied unconditionally, not behind hover:) so the anti-pattern
                reads in a static screenshot — a real hover only fires on interaction. */}
            <AccordionTrigger className="bg-paper-deep no-underline">What is Quill?</AccordionTrigger>
            <AccordionContent>
              Quill is a calm, editorial design system for building interfaces by hand.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="bg-paper-deep no-underline">Is there a dark mode?</AccordionTrigger>
            <AccordionContent>
              Components support a .dark class for consumer dark surfaces.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      }
    />
  ),
}
