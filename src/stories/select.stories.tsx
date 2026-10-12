'use client'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { usage } from '@/usage/select.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-64'

const meta = {
  title: 'Components / Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    disabled: { control: 'boolean', description: 'Disable the select', table: { defaultValue: { summary: 'false' } } },
  },
  decorators: [inColumn(COLUMN)],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-full" aria-label="Select category">
        <SelectValue placeholder="Select category…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Art & Craft</SelectLabel>
          <SelectItem value="watercolor">Watercolor</SelectItem>
          <SelectItem value="calligraphy">Calligraphy</SelectItem>
          <SelectItem value="pottery">Pottery</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Writing</SelectLabel>
          <SelectItem value="journaling">Journaling</SelectItem>
          <SelectItem value="poetry">Poetry</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const wrapper = canvasElement.querySelector('[data-theme]')
    if (!wrapper) throw new Error('themed wrapper not found')
    const closedBottom = wrapper.getBoundingClientRect().bottom

    const trigger = canvas.getByRole('combobox', { name: 'Select category' })
    await userEvent.click(trigger)

    const listbox = await screen.findByRole('listbox')
    const popupBottom = listbox.getBoundingClientRect().bottom

    await waitFor(() => {
      expect(wrapper.getBoundingClientRect().bottom).toBeGreaterThanOrEqual(popupBottom)
    })
    expect(wrapper.getBoundingClientRect().bottom).toBeGreaterThan(closedBottom)
  },
}

export const WithValue: Story = {
  render: () => (
    // items maps each value to its label; without it the closed trigger shows the raw value ("calligraphy").
    <Select defaultValue="calligraphy" items={{ watercolor: 'Watercolor', calligraphy: 'Calligraphy', pottery: 'Pottery', journaling: 'Journaling', poetry: 'Poetry' }}>
      <SelectTrigger className="w-full" aria-label="Select category">
        <SelectValue placeholder="Select category…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Art & Craft</SelectLabel>
          <SelectItem value="watercolor">Watercolor</SelectItem>
          <SelectItem value="calligraphy">Calligraphy</SelectItem>
          <SelectItem value="pottery">Pottery</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Writing</SelectLabel>
          <SelectItem value="journaling">Journaling</SelectItem>
          <SelectItem value="poetry">Poetry</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="category" className="text-sm font-medium leading-none">
        Category
      </label>
      <Select>
        <SelectTrigger id="category" className="w-full">
          <SelectValue placeholder="Select category…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Art & Craft</SelectLabel>
            <SelectItem value="watercolor">Watercolor</SelectItem>
            <SelectItem value="calligraphy">Calligraphy</SelectItem>
            <SelectItem value="pottery">Pottery</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Writing</SelectLabel>
            <SelectItem value="journaling">Journaling</SelectItem>
            <SelectItem value="poetry">Poetry</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
}

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger size="sm" className="w-full" aria-label="Select category">
        <SelectValue placeholder="Select category…" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Art & Craft</SelectLabel>
          <SelectItem value="watercolor">Watercolor</SelectItem>
          <SelectItem value="calligraphy">Calligraphy</SelectItem>
          <SelectItem value="pottery">Pottery</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Writing</SelectLabel>
          <SelectItem value="journaling">Journaling</SelectItem>
          <SelectItem value="poetry">Poetry</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-full" aria-label="Select category">
        <SelectValue placeholder="Not available" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="watercolor">Watercolor</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair exampleClassName={COLUMN}
      usage={usage}
      id="always-provide-placeholder"
      doExample={
        <Select>
          <SelectTrigger className="w-full" aria-label="Select category">
            <SelectValue placeholder="Select category…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="watercolor">Watercolor</SelectItem>
            <SelectItem value="calligraphy">Calligraphy</SelectItem>
          </SelectContent>
        </Select>
      }
      dontExample={
        <Select>
          <SelectTrigger className="w-full" aria-label="Select category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="watercolor">Watercolor</SelectItem>
            <SelectItem value="calligraphy">Calligraphy</SelectItem>
          </SelectContent>
        </Select>
      }
    />
  ),
}
