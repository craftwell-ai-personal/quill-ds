import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Citation, Sources, type Source } from '../../registry/lib/citations'
import { usage } from '@/usage/citations.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'
import { expectFocusRing } from './focus-ring'

const SOURCES: Source[] = [
  { title: 'Q3 board deck.pdf', label: 'Q3 deck', detail: 'Page 4 · Quarterly targets', snippet: 'July 4,100 · August 4,300 · September 4,800 signups.', kind: 'file' },
  { title: 'signups-sept.csv', label: 'signups-sept', detail: '812 rows', snippet: '4,226 signups, 12% under target.', kind: 'file' },
  { title: 'New pricing page', label: 'changelog', detail: 'craftwell.ai/changelog', snippet: 'Shipped 9 September: annual plans shown first.', href: 'https://craftwell.ai/changelog', kind: 'web' },
]

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-[34rem] max-w-full'

const meta = {
  title: 'Components / Citations',
  component: Sources,
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: renderUsageDocs(usage) } } },
  decorators: [inColumn(COLUMN)],
  args: { sources: SOURCES },
} satisfies Meta<typeof Sources>

export default meta
type Story = StoryObj<typeof meta>

const Answer = () => (
  <p className="text-sm leading-relaxed">
    Signups beat target in July and August<Citation source={SOURCES[0]} /> but fell 12% short in September<Citation source={SOURCES[1]} />. The dip matches the pricing page change on 9 September<Citation source={SOURCES[2]} />.
  </p>
)

export const InAnAnswer: Story = {
  render: (args) => <div className="grid gap-3"><Answer /><Sources {...args} /></div>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Q3 deck, source: Q3 board deck.pdf' })
    await expect(chip).toHaveTextContent('Q3 deck')
    // Label in Name (WCAG 2.5.3): the accessible name starts with the visible text.
    await expect(chip.getAttribute('aria-label')?.startsWith(chip.textContent ?? '')).toBe(true)
    await expect(chip.getBoundingClientRect().height).toBeGreaterThanOrEqual(20)
    await expect(canvas.getByRole('link', { name: 'changelog, source: New pricing page' })).toHaveAttribute('href', 'https://craftwell.ai/changelog')
    // Keyboard focus opens the same preview as hover (it renders in a portal on the page body).
    chip.focus()
    await waitFor(() => expect(within(document.body).getByText('July 4,100 · August 4,300 · September 4,800 signups.')).toBeVisible())
  },
}
const SNIPPET = 'July 4,100 · August 4,300 · September 4,800 signups.'
const previewText = () => within(document.body).queryByText(SNIPPET)
const NO_HREF_CHIP = { name: 'Q3 deck, source: Q3 board deck.pdf' }

// A chip with no link has nothing to open, so a press (tap, screen-reader activate) opens its preview instead.
export const PressOpensPreview: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    await expect(chip).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeVisible())
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
  },
}
export const PressAgainOrEscapeCloses: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeVisible())
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeNull())
    await expect(chip).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(previewText()).toBeNull())
    await expect(chip).toHaveAttribute('aria-expanded', 'false')
  },
}
// Pressing never closes a card that hover or focus just opened: it pins it, and the next press unpins and closes.
export const KeyboardPressPinsFocusPreview: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    chip.focus()
    await waitFor(() => expect(previewText()).toBeVisible())
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Enter}')
    await expect(previewText()).toBeVisible()
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(previewText()).toBeNull())
    await expect(chip).toHaveAttribute('aria-expanded', 'false')
  },
}
export const MousePressPinsHoverPreview: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    await userEvent.hover(chip)
    await waitFor(() => expect(previewText()).toBeVisible(), { timeout: 3000 })
    await userEvent.click(chip)
    await expect(previewText()).toBeVisible()
    await userEvent.unhover(chip)
    // Past the 300ms close delay: a pinned card ignores the pointer leaving.
    await new Promise((resolve) => setTimeout(resolve, 700))
    await expect(previewText()).toBeVisible()
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeNull())
  },
}
export const BlurClosesPinned: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} /> <Button type="button" variant="outline" size="sm" className="w-fit">Elsewhere</Button></p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    chip.focus()
    await waitFor(() => expect(previewText()).toBeVisible())
    await userEvent.keyboard('{Enter}')
    await new Promise((resolve) => setTimeout(resolve, 400))
    await expect(previewText()).toBeVisible()
    // The card itself is focusable: pressing inside it (to select the quoted line) must not count as leaving the chip.
    await userEvent.click(previewText()!)
    await new Promise((resolve) => setTimeout(resolve, 400))
    await expect(previewText()).toBeVisible()
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
    // A genuine move of focus to something else lets go.
    canvas.getByRole('button', { name: 'Elsewhere' }).focus()
    await waitFor(() => expect(previewText()).toBeNull())
    await expect(chip).toHaveAttribute('aria-expanded', 'false')
  },
}
export const TabAwayClosesPinned: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} /> <Button type="button" variant="outline" size="sm" className="w-fit">Elsewhere</Button></p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    chip.focus()
    await userEvent.keyboard('{Enter}')
    await new Promise((resolve) => setTimeout(resolve, 400))
    await expect(previewText()).toBeVisible()
    await userEvent.tab()
    await waitFor(() => expect(previewText()).toBeNull())
  },
}
export const EscapeDoesNotLeavePinStuck: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(previewText()).toBeNull())
    // Unpinned again: hovering opens it and leaving closes it.
    await userEvent.hover(chip)
    await waitFor(() => expect(previewText()).toBeVisible(), { timeout: 3000 })
    await userEvent.unhover(chip)
    await waitFor(() => expect(previewText()).toBeNull(), { timeout: 3000 })
  },
}
function HrefSwitch() {
  const [href, setHref] = React.useState<string | undefined>(undefined)
  return (
    <p className="text-sm">
      Signups beat target<Citation source={{ ...SOURCES[0], href }} />.
      <Button type="button" variant="outline" size="sm" className="ml-2" data-testid="give-href" onClick={() => setHref('https://craftwell.ai/q3')}>Give it a link</Button>
    </p>
  )
}
export const HrefAppearsWhileMounted: Story = {
  render: () => <HrefSwitch />,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeVisible())
    // A programmatic click keeps focus on the chip, so only the re-render can close the card.
    canvas.getByTestId('give-href').click()
    const link = await canvas.findByRole('link', NO_HREF_CHIP)
    await expect(link).toHaveAttribute('href', 'https://craftwell.ai/q3')
    await expect(link).not.toHaveAttribute('aria-expanded')
    await waitFor(() => expect(previewText()).toBeNull())
    await userEvent.hover(link)
    await waitFor(() => expect(previewText()).toBeVisible(), { timeout: 3000 })
    await userEvent.unhover(link)
    await waitFor(() => expect(previewText()).toBeNull(), { timeout: 3000 })
  },
}
export const PressOutsideCloses: Story = {
  render: () => <div className="grid gap-3"><p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p><p data-testid="elsewhere" className="text-sm">Elsewhere on the page.</p></div>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    await userEvent.click(chip)
    await waitFor(() => expect(previewText()).toBeVisible())
    await userEvent.click(canvas.getByTestId('elsewhere'))
    await waitFor(() => expect(previewText()).toBeNull())
  },
}
export const TouchTapStaysOpen: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', NO_HREF_CHIP)
    const touch = (type: string) => chip.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true }))
    // A phone tap: pointer down, the browser focuses the button, pointer up, then the click.
    touch('pointerdown')
    chip.focus()
    touch('pointerup')
    chip.click()
    await waitFor(() => expect(previewText()).toBeVisible())
    // Hold past the focus/hover delays: an open-then-close race would shut it here.
    await new Promise((resolve) => setTimeout(resolve, 900))
    await expect(previewText()).toBeVisible()
    await expect(chip).toHaveAttribute('aria-expanded', 'true')
  },
}
export const LinkChipStaysALink: Story = {
  render: () => <p className="text-sm">Annual plans shown first<Citation source={SOURCES[2]} />.</p>,
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('link', { name: 'changelog, source: New pricing page' })
    await expect(chip).toHaveAttribute('href', 'https://craftwell.ai/changelog')
    await expect(chip).not.toHaveAttribute('aria-expanded')
    // Hover/focus still previews; pressing is the link's own job, so no toggle state appears.
    chip.focus()
    await waitFor(() => expect(within(document.body).getByText('Shipped 9 September: annual plans shown first.')).toBeVisible())
    await expect(chip).not.toHaveAttribute('aria-expanded')
  },
}
export const LongTitleNoLabel: Story = {
  args: { sources: [] },
  render: () => (
    <p className="text-sm">
      Revenue is on plan<Citation source={{ title: 'Quarterly revenue reconciliation workbook, final version for the board', kind: 'file' }} />.
    </p>
  ),
  play: async ({ canvas }) => {
    const chip = canvas.getByRole('button', { name: 'Source: Quarterly revenue reconciliation workbook, final version for the board' })
    // max-w-40 is 10rem; the chip truncates instead of growing with the title.
    const maxWidth = 10 * parseFloat(getComputedStyle(document.documentElement).fontSize)
    await expect(chip.getBoundingClientRect().width).toBeLessThanOrEqual(maxWidth + 1)
    await expect(chip.scrollWidth).toBeGreaterThan(chip.clientWidth)
  },
}
export const ChipsShowFocusRing: Story = {
  render: () => <p className="text-sm">Signups beat target<Citation source={SOURCES[0]} /> and the page changed<Citation source={SOURCES[2]} />.</p>,
  play: async ({ canvas }) => {
    await expectFocusRing(canvas.getByRole('button', NO_HREF_CHIP))
    await expectFocusRing(canvas.getByRole('link', { name: 'changelog, source: New pricing page' }))
  },
}
export const SourcesShowFocusRing: Story = {
  args: { defaultOpen: true },
  play: async ({ canvas }) => {
    await expectFocusRing(canvas.getByRole('button', { name: /3 sources/ }))
    await expectFocusRing(canvas.getByRole('link', { name: /New pricing page/ }))
  },
}
// A web source with no address or page still says what kind of thing it is.
export const WebSourceWithoutDetailSaysWebPage: Story = {
  render: () => <p className="text-sm">Docs say so<Citation source={{ title: 'Vendor docs', label: 'docs', kind: 'web' }} /> and the file<Citation source={{ title: 'Notes.txt', label: 'notes', kind: 'file' }} />.</p>,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'docs, source: Vendor docs' }))
    await waitFor(() => expect(within(document.body).getByText('Web page')).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await userEvent.click(canvas.getByRole('button', { name: 'notes, source: Notes.txt' }))
    await waitFor(() => expect(within(document.body).getByText('File')).toBeVisible())
  },
}
export const SourcesList: Story = {
  play: async ({ canvas }) => {
    const pill = canvas.getByRole('button', { name: /3 sources/ })
    await expect(pill).toHaveAttribute('aria-expanded', 'false')
    await expect(canvas.getByText('signups-sept.csv')).not.toBeVisible()
    await userEvent.click(pill)
    await expect(canvas.getByText('signups-sept.csv')).toBeVisible()
  },
}
export const OneSource: Story = {
  args: { sources: [SOURCES[0]], defaultOpen: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /1 source$/ })).toBeVisible()
  },
}
export const NoSources: Story = {
  args: { sources: [] },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="sources"]')).toBeNull()
  },
}
export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  args: { sources: SOURCES },
  render: () => (
    <DoDontPair exampleClassName={COLUMN} usage={usage} id="chip-after-claim"
      doExample={<Answer />}
      dontExample={<div className="grid gap-1 text-sm"><p>Signups beat target in July and August but fell 12% short in September. The dip matches the pricing page change.</p><p className="text-xs text-muted-foreground">Sources: Q3 board deck.pdf, signups-sept.csv, New pricing page</p></div>} />
  ),
}
