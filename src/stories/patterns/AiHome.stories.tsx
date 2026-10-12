import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { AiHome } from '@registry/blocks/ai-home'
import { usage } from '@/usage/ai-home.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'

const meta = {
  title: 'Patterns / AI / AI Home',
  component: AiHome,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: renderUsageDocs(usage) } } },
  args: { onSubmit: fn(), onAdd: fn(), onMic: fn() },
} satisfies Meta<typeof AiHome>

export default meta
type Story = StoryObj<typeof meta>

// The test runner sizes its page from these (addon-vitest reads the viewport global).
const VIEWPORTS = {
  desktop: { name: 'Desktop 1024', styles: { width: '1024px', height: '800px' }, type: 'desktop' },
  phone: { name: 'Phone 375', styles: { width: '375px', height: '812px' }, type: 'mobile' },
} as const

export const Default: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvas }) => {
    const heading = canvas.getByRole('heading', { name: 'What should we work on?' })
    await expect(heading).toBeVisible()
    // Matches the approved sketch: a calm 24px heading with no AI mark in front of it.
    await expect(heading.querySelector('svg')).toBeNull()
    await expect(getComputedStyle(heading).fontSize).toBe('24px')
    await expect(getComputedStyle(heading).fontFamily).toMatch(/Fraunces/)
    // The toolbar carries the + menu and the mic, as in the sketch; the Agent tab has its icon.
    await expect(canvas.getByRole('button', { name: 'Add files or context' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Dictate' })).toBeVisible()
    await expect(canvas.getByRole('tab', { name: 'Agent' }).querySelector('svg')).not.toBeNull()
    // The composer takes its full max-w-2xl (672px) once the page is wider than that.
    const composer = canvas.getByRole('textbox', { name: 'Message' }).closest('[data-slot="prompt-composer"]') as HTMLElement
    await expect(composer.getBoundingClientRect().width).toBeCloseTo(672, 0)
    const textbox = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.click(canvas.getByRole('button', { name: /Plan my week/ }))
    await expect(textbox).toHaveValue('Plan my week around my meetings')
    await expect(textbox).toHaveFocus() // the starter fills the box and hands it the cursor
  },
}

// The same page with the Agent tab chosen: its own placeholder, and the selected tab's curves sit over Ask.
export const AgentTab: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Agent' }))
    await expect(canvas.getByRole('tab', { name: 'Agent', selected: true })).toBeVisible()
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toHaveAttribute('placeholder', 'What should your agent take on?')
  },
}

export const Phone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'What should we work on?' })).toBeVisible()
    await expect(window.innerWidth).toBeLessThanOrEqual(375)
    // No sideways scroll at phone width.
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
