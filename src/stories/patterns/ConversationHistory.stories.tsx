import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import * as React from 'react'
import { expect, fireEvent, fn, userEvent, waitFor, within } from 'storybook/test'
import { ConversationHistory, ConversationSidebar, groupConversations, type Conversation } from '@registry/blocks/conversation-history'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { usage } from '@/usage/conversation-history.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { compositeOver, contrastRatio, surfaceBehind } from '../contrast'
import { expectFocusRing } from '../focus-ring'

const NOW = new Date(2026, 9, 6, 12, 0)
const CHATS: Conversation[] = [
  { id: 'a', title: 'Weekly growth review prompt', updatedAt: new Date(2026, 8, 20), pinned: true },
  { id: 'b', title: 'Q3 signups vs target', updatedAt: new Date(2026, 9, 6, 9, 0) },
  { id: 'c', title: 'Launch brief draft', updatedAt: new Date(2026, 9, 6, 0, 0) },
  { id: 'd', title: 'Pricing page copy ideas', updatedAt: new Date(2026, 9, 5, 23, 59) },
  { id: 'e', title: 'Plan my week around the offsite', updatedAt: new Date(2026, 8, 30) },
  { id: 'f', title: 'Hiring plan notes', updatedAt: new Date(2026, 8, 12) },
  { id: 'g', title: 'Summer campaign recap', updatedAt: new Date(2026, 7, 3) },
  { id: 'h', title: 'From the future', updatedAt: new Date(2026, 9, 9) },
  { id: 'i', title: 'No date', updatedAt: 'not a date' },
]
const CARD = 'w-[18.75rem] max-w-full rounded-xl border border-border bg-card p-2 shadow-sm'

const meta = {
  title: 'Patterns / AI / Conversation History',
  component: ConversationHistory,
  tags: ['autodocs'],
  // Centred by the theme wrapper (see AiSidePanel.stories.tsx for why not `layout: 'centered'`).
  parameters: { layout: 'fullscreen', quillCentered: true, docs: { description: { component: renderUsageDocs(usage) } } },
  // A long Undo window by default, so no story's delete commits behind another assertion's back.
  args: { onSelect: fn(), onNew: fn(), onRename: fn(), onPin: fn(), onDelete: fn(), undoSeconds: 60, className: CARD },
} satisfies Meta<typeof ConversationHistory>

export default meta
type Story = StoryObj<typeof meta>

type Args = React.ComponentProps<typeof ConversationHistory>

// The app's side of a controlled list: it owns the chats and applies what the callbacks report.
function Owned({ initial = CHATS, ...args }: Args & { initial?: Conversation[] }) {
  const [chats, setChats] = React.useState(initial)
  const [current, setCurrent] = React.useState<string | null>('b')
  return (
    <ConversationHistory {...args} now={NOW} conversations={chats} currentId={current}
      onSelect={(id) => { setCurrent(id); args.onSelect?.(id) }}
      onRename={(id, title) => { setChats((all) => all.map((chat) => (chat.id === id ? { ...chat, title } : chat))); args.onRename?.(id, title) }}
      onPin={(id, pinned) => { setChats((all) => all.map((chat) => (chat.id === id ? { ...chat, pinned } : chat))); args.onPin?.(id, pinned) }}
      onDelete={(id) => { setChats((all) => all.filter((chat) => chat.id !== id)); args.onDelete?.(id) }} />
  )
}

const page = () => within(document.body)
const rowOf = (canvasElement: HTMLElement, title: string) =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-slot="chat-row"]')].find((row) => row.textContent?.includes(title)) as HTMLElement
const openMenu = async (canvas: ReturnType<typeof within>, title: string) => {
  await userEvent.click(canvas.getByRole('button', { name: `More for ${title}` }))
  return page().findByRole('menu')
}
// Base UI keeps a closing menu (and its focus guards) mounted through the exit transition; wait for it to go, so the
// a11y scan that runs after the story does not catch that half-closed state (as dropdown-menu.stories.tsx does).
const closeMenu = async () => {
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(page().queryByRole('menu')).toBeNull())
}
const groupLabels = (canvasElement: HTMLElement) => [...canvasElement.querySelectorAll('[data-slot="chat-group"]')].map((heading) => heading.textContent)

// With no props: the sample, kept by the list itself. This is what the docs page and the Figma frame show.
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const nav = canvas.getByRole('navigation', { name: 'Past chats' })
    await expect(within(nav).getByRole('button', { name: 'New chat' })).toBeVisible()
    await expect(groupLabels(canvasElement)).toEqual(['Pinned', 'Today', 'Yesterday', 'Previous 7 days'])
    await expect(within(nav).getByRole('list', { name: 'Today' })).toBeVisible()
    const open = within(nav).getByRole('button', { name: 'Q3 signups vs target' })
    await expect(open).toHaveAttribute('aria-current', 'true')
    await expect(within(nav).getAllByRole('button', { name: /^More for / })).toHaveLength(5)
    // The live region is on the page, empty, before anything happens.
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
  },
}

// The sample is live: it can be renamed without an app behind it. Kept out of Default, whose end state is what the
// Figma visual diff captures.
export const SampleIsLive: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Rename' }))
    const field = await canvas.findByRole('textbox', { name: 'Rename Launch brief draft' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Launch brief v2{Enter}')
    await expect(await canvas.findByRole('button', { name: 'Launch brief v2' })).toBeVisible()
  },
}

export const GroupsByDate: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, canvasElement }) => {
    await expect(groupLabels(canvasElement)).toEqual(['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'September 2026', 'August 2026', 'Earlier'])
    // Newest first inside a group; a date in the future is not lost, it reads as today; midnight belongs to its own day.
    const today = within(canvas.getByRole('list', { name: 'Today' })).getAllByRole('listitem').map((row) => row.textContent)
    await expect(today).toEqual(['From the future', 'Q3 signups vs target', 'Launch brief draft'])
    await expect(within(canvas.getByRole('list', { name: 'Yesterday' })).getByText('Pricing page copy ideas')).toBeVisible()
    await expect(within(canvas.getByRole('list', { name: 'Earlier' })).getByText('No date')).toBeVisible()
    // The same rule, as a function: a pinned chat is only ever under Pinned.
    const groups = groupConversations(CHATS, NOW)
    await expect(groups.flatMap((group) => group.chats).filter((chat) => chat.id === 'a')).toHaveLength(1)
    await expect(groups[0].key).toBe('pinned')
  },
}

export const SelectAChat: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Launch brief draft' }))
    await expect(args.onSelect).toHaveBeenCalledWith('c')
    await expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toHaveAttribute('aria-current', 'true')
    await expect(canvas.getByRole('button', { name: 'Q3 signups vs target' })).not.toHaveAttribute('aria-current')
  },
}

// The open chat's fill alone nearly vanishes on the dark themes, so its row also carries a hairline. This is a
// "can be told apart" guard, not a WCAG number: the open chat is also marked by aria-current and medium weight.
// Run under each theme by the theme gate (QUILL_THEME).
export const OpenChatReadsInEveryTheme: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvasElement }) => {
    const row = rowOf(canvasElement, 'Q3 signups vs target')
    const style = getComputedStyle(row)
    await expect(style.borderTopWidth).toBe('1px')
    // The hairline costs no height: the row is still 32px, and so is one that is not open.
    await expect(row.getBoundingClientRect().height).toBe(32)
    await expect(rowOf(canvasElement, 'Launch brief draft').getBoundingClientRect().height).toBe(32)
    const card = surfaceBehind(row)
    const line = compositeOver(style.borderTopColor, `rgb(${card.join(' ')})`)
    const ratio = contrastRatio(line, card)
    console.log(`conversation-history open row hairline on card ${ratio.toFixed(2)}:1`)
    await expect(ratio).toBeGreaterThanOrEqual(1.2)
    // A row that is not open shows no line.
    const idle = getComputedStyle(rowOf(canvasElement, 'Launch brief draft'))
    await expect(contrastRatio(compositeOver(idle.borderTopColor, `rgb(${card.join(' ')})`), card)).toBe(1)
    // Titles stay in one column: the open row's text starts where its neighbour's does.
    const left = (title: string) => canvasElement.querySelector(`[data-slot="chat-row"] [data-slot="chat-open"]${title === 'open' ? '[aria-current]' : ':not([aria-current])'}`)!.getBoundingClientRect().left
    await expect(left('open')).toBe(left('idle'))
  },
}

// Ryan's note on the sketch: the dots are bigger and darker than the stock 12px muted glyph, in the same 24px button.
export const MoreDotsMatchTheSketch: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, canvasElement }) => {
    const more = canvas.getByRole('button', { name: 'More for Launch brief draft' })
    const dots = more.querySelector('svg') as SVGElement
    await expect(more.getBoundingClientRect().width).toBe(24)
    await expect(more.getBoundingClientRect().height).toBe(24)
    await expect(dots.getBoundingClientRect().width).toBe(16)
    await expect(dots.getBoundingClientRect().height).toBe(16)
    // Ink-soft, read from a throwaway element so no colour is typed here.
    const probe = document.createElement('span')
    probe.className = 'text-ink-soft'
    more.parentElement!.append(probe)
    await expect(getComputedStyle(more).color).toBe(getComputedStyle(probe).color)
    probe.remove()
    // The bigger glyph costs no height.
    await expect(rowOf(canvasElement, 'Launch brief draft').getBoundingClientRect().height).toBe(32)
  },
}

// Faint until wanted, but never out of reach: hover, keyboard focus, the open chat, and an open menu all show it.
export const MoreButtonShows: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas }) => {
    const idle = canvas.getByRole('button', { name: 'More for Launch brief draft' })
    const onOpenChat = canvas.getByRole('button', { name: 'More for Q3 signups vs target' })
    await expect(getComputedStyle(onOpenChat).opacity).toBe('1')
    // Only meaningful where there is a mouse; on a touch screen it is always shown.
    if (window.matchMedia('(pointer: fine)').matches) await expect(getComputedStyle(idle).opacity).toBe('0')
    idle.focus()
    // The stock Button eases every property it changes, opacity included; read it once it has settled.
    await waitFor(() => expect(getComputedStyle(idle).opacity).toBe('1'))
    await userEvent.click(idle)
    await page().findByRole('menu')
    await expect(idle).toHaveAttribute('aria-expanded', 'true')
    await expect(getComputedStyle(idle).opacity).toBe('1')
    await closeMenu()
  },
}

// Ryan's note on the sketch: 2px between the row's highlighted background and its menu.
export const MenuSitsTwoPixelsBelowTheRow: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, canvasElement }) => {
    const menu = await openMenu(canvas, 'Q3 signups vs target')
    const row = rowOf(canvasElement, 'Q3 signups vs target')
    // The menu eases in; measure once it has settled.
    await waitFor(() => expect(Math.abs(menu.getBoundingClientRect().top - row.getBoundingClientRect().bottom - 2)).toBeLessThanOrEqual(0.5))
    // And its right edge is the row's right edge (border included), not the "more" button's, a few pixels inside.
    await expect(Math.abs(menu.getBoundingClientRect().right - row.getBoundingClientRect().right)).toBeLessThanOrEqual(0.5)
    const items = within(menu).getAllByRole('menuitem').map((item) => item.textContent)
    await expect(items).toEqual(['Rename', 'Pin', 'Delete'])
    await expect(within(menu).getByRole('separator')).toBeVisible()
    await closeMenu()
  },
}

export const RenameByKeyboard: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    canvas.getByRole('button', { name: 'More for Launch brief draft' }).focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(await within(await page().findByRole('menu')).findByRole('menuitem', { name: 'Rename' }))
    const field = await canvas.findByRole('textbox', { name: 'Rename Launch brief draft' }) as HTMLInputElement
    await waitFor(() => expect(field).toHaveFocus())
    // The whole title is selected, so typing replaces it.
    await expect(field.selectionEnd! - field.selectionStart!).toBe('Launch brief draft'.length)
    await userEvent.keyboard('Launch brief, final{Enter}')
    const row = await canvas.findByRole('button', { name: 'Launch brief, final' })
    await waitFor(() => expect(row).toHaveFocus())
    await expect(args.onRename).toHaveBeenCalledTimes(1)
    await expect(args.onRename).toHaveBeenCalledWith('c', 'Launch brief, final')

    // Escape leaves the title as it was and reports nothing; so does a blank name.
    await userEvent.click(await within(await openMenu(canvas, 'Pricing page copy ideas')).findByRole('menuitem', { name: 'Rename' }))
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Rename Pricing page copy ideas' }), ' changed{Escape}')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Pricing page copy ideas' })).toHaveFocus())
    await userEvent.click(await within(await openMenu(canvas, 'Pricing page copy ideas')).findByRole('menuitem', { name: 'Rename' }))
    const blank = await canvas.findByRole('textbox', { name: 'Rename Pricing page copy ideas' })
    await userEvent.clear(blank)
    await userEvent.type(blank, '   {Enter}')
    await expect(await canvas.findByRole('button', { name: 'Pricing page copy ideas' })).toBeVisible()
    await expect(args.onRename).toHaveBeenCalledTimes(1)
  },
}

export const PinMovesIt: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Pin' }))
    await expect(args.onPin).toHaveBeenCalledWith('c', true)
    await waitFor(() => expect(within(canvas.getByRole('list', { name: 'Pinned' })).getByText('Launch brief draft')).toBeVisible())
    await expect(within(canvas.getByRole('list', { name: 'Today' })).queryByText('Launch brief draft')).toBeNull()
    // The row moved; the cursor went with it.
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toHaveFocus())
    const menu = await openMenu(canvas, 'Launch brief draft')
    await expect(within(menu).getByRole('menuitem', { name: 'Unpin' })).toBeVisible()
    await closeMenu()
  },
}

// A menu or dialog that is still animating in ignores the pointer (Base UI sets `pointer-events: none`
// until the transition ends), and a click sent then throws. The value inherits, so the target answers
// for its ancestors.
const clickWhenReady = async (target: HTMLElement) => {
  await waitFor(() => expect(getComputedStyle(target).pointerEvents).not.toBe('none'))
  await userEvent.click(target)
}

const confirmDelete = async (canvas: ReturnType<typeof within>, title: string) => {
  await clickWhenReady(await within(await openMenu(canvas, title)).findByRole('menuitem', { name: 'Delete' }))
  const dialog = await page().findByRole('alertdialog', { name: 'Delete this chat?' })
  await expect(dialog).toHaveTextContent(title)
  await clickWhenReady(within(dialog).getByRole('button', { name: 'Delete' }))
}

// The Undo button leads with an undo arrow, a decorative one: the button is still named "Undo".
export const UndoHasAnIcon: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    const arrow = undo.querySelector('svg') as SVGElement
    await expect(arrow).not.toBeNull()
    await expect(arrow).toHaveAttribute('aria-hidden', 'true')
    // Before the word, not after it.
    await expect(undo.firstElementChild).toBe(arrow)
    await expect(arrow.getBoundingClientRect().right).toBeLessThanOrEqual(undo.getBoundingClientRect().right)
    await expect(undo.textContent?.trim()).toBe('Undo')
  },
}

export const DeleteThenUndo: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    // It asks first, and Cancel changes nothing.
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Delete' }))
    const dialog = await page().findByRole('alertdialog', { name: 'Delete this chat?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(page().queryByRole('alertdialog')).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toBeVisible()

    await confirmDelete(canvas, 'Launch brief draft')
    // The row becomes one line, in the same place, with Undo holding the cursor.
    const today = canvas.getByRole('list', { name: 'Today' })
    await waitFor(() => expect(within(today).getByText(/Deleted .Launch brief draft./)).toBeVisible())
    await expect(canvas.queryByRole('button', { name: 'Launch brief draft' })).toBeNull()
    const undo = within(today).getByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    await expect(canvas.getByRole('status')).toHaveTextContent('Deleted Launch brief draft. Undo is available.')
    await expect(args.onDelete).not.toHaveBeenCalled()

    await userEvent.click(undo)
    const row = await canvas.findByRole('button', { name: 'Launch brief draft' })
    await waitFor(() => expect(row).toHaveFocus())
    await expect(canvas.getByRole('status')).toHaveTextContent('Restored Launch brief draft.')
    await expect(args.onDelete).not.toHaveBeenCalled()
  },
}

export const DeleteCommits: Story = {
  args: { undoSeconds: 0.3 },
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    // While the cursor rests on Undo the countdown waits: half a second later the chat is still recoverable.
    await new Promise((resolve) => setTimeout(resolve, 500))
    await expect(args.onDelete).not.toHaveBeenCalled()
    // Moving on lets it run out.
    canvas.getByRole('button', { name: 'New chat' }).focus()
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1), { timeout: 3000 })
    await expect(args.onDelete).toHaveBeenCalledWith('c')
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull())
    await expect(canvas.queryByText(/Launch brief draft/)).toBeNull()
  },
}

// A second delete settles the first at once; undoing the second leaves the first deleted.
export const TwoDeletes: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    await canvas.findByRole('button', { name: 'Undo' })
    await confirmDelete(canvas, 'Pricing page copy ideas')
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
    await expect(args.onDelete).toHaveBeenCalledWith('c')
    await expect(canvas.getAllByRole('button', { name: 'Undo' })).toHaveLength(1)
    await userEvent.click(canvas.getByRole('button', { name: 'Undo' }))
    await expect(await canvas.findByRole('button', { name: 'Pricing page copy ideas' })).toBeVisible()
    await expect(args.onDelete).toHaveBeenCalledTimes(1)
  },
}

function Leavable(args: Args) {
  const [here, setHere] = React.useState(true)
  return (
    <div className="grid gap-3">
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setHere(false)}>Leave</Button>
      {here ? <Owned {...args} /> : <p>Gone</p>}
    </div>
  )
}

// Confirmed and not undone: leaving the page must not quietly cancel the delete.
export const UnmountCommits: Story = {
  render: (args) => <Leavable {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    await canvas.findByRole('button', { name: 'Undo' })
    await expect(args.onDelete).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }))
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await expect(args.onDelete).toHaveBeenCalledTimes(1)
    await expect(args.onDelete).toHaveBeenCalledWith('c')
  },
}

// An app's own list only offers what the app wired. No dead menu items, no dead buttons.
export const OnlyWhatIsWired: Story = {
  render: (args) => (
    <div className="grid gap-4">
      <ConversationHistory className={args.className} label="Rename only" now={NOW} conversations={CHATS.slice(1, 3)} onRename={args.onRename} />
      <ConversationHistory className={args.className} label="Read only" now={NOW} conversations={CHATS.slice(1, 3)} />
    </div>
  ),
  play: async ({ canvas }) => {
    const renameOnly = canvas.getByRole('navigation', { name: 'Rename only' })
    await expect(within(renameOnly).queryByRole('button', { name: 'New chat' })).toBeNull()
    await userEvent.click(within(renameOnly).getByRole('button', { name: 'More for Q3 signups vs target' }))
    const menu = await page().findByRole('menu')
    await expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Rename'])
    await expect(within(menu).queryByRole('separator')).toBeNull()
    await closeMenu()
    const readOnly = canvas.getByRole('navigation', { name: 'Read only' })
    await expect(within(readOnly).queryByRole('button', { name: /^More for / })).toBeNull()
    await expect(within(readOnly).getAllByRole('button')).toHaveLength(2)
  },
}

export const Empty: Story = {
  args: { conversations: [], now: NOW },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No chats yet.')).toBeVisible()
    await expect(canvas.queryByRole('list')).toBeNull()
    await expect(canvas.getByRole('button', { name: 'New chat' })).toBeVisible()
  },
}

export const LongAndLinked: Story = {
  args: {
    now: NOW,
    conversations: [
      { id: 'long', title: 'A very long title that will never fit on one line of a three hundred pixel column', updatedAt: NOW },
      { id: 'link', title: 'Opens as a link', updatedAt: NOW, href: '#link' },
    ],
    currentId: 'link',
  },
  play: async ({ canvas, canvasElement }) => {
    const nav = canvas.getByRole('navigation', { name: 'Past chats' })
    const long = canvas.getByRole('button', { name: /^A very long title/ })
    // One line, cut with an ellipsis; the column does not grow or scroll sideways.
    await expect(long.scrollWidth).toBeGreaterThan(long.clientWidth)
    await expect(nav.scrollWidth).toBeLessThanOrEqual(nav.clientWidth)
    await expect(rowOf(canvasElement, 'A very long title').getBoundingClientRect().height).toBeLessThanOrEqual(34)
    // A chat with an href is a real link, and the open one is the current page.
    const link = canvas.getByRole('link', { name: 'Opens as a link' })
    await expect(link).toHaveAttribute('href', '#link')
    await expect(link).toHaveAttribute('aria-current', 'page')
  },
}

export const RowShowsFocusRing: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas }) => {
    const open = canvas.getByRole('button', { name: 'Launch brief draft' })
    // The ring is the row's, so it wraps the ⋯ button too rather than stopping at the title.
    await expectFocusRing(open, open.closest<HTMLElement>('.group\\/row')!)
  },
}

// The same list docked in the stock Sidebar, with the page beside it.
export const Docked: Story = {
  parameters: { quillCentered: false },
  render: (args) => (
    <ConversationSidebar {...args} className={undefined} now={NOW} conversations={CHATS} currentId="b" title="Q3 signups vs target">
      <p className="text-sm text-muted-foreground">The open chat goes here.</p>
    </ConversationSidebar>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('The open chat goes here.')).toBeVisible()
    // The stock rail carries the same name as the trigger; the trigger is the one in the top bar.
    const trigger = canvas.getAllByRole('button', { name: 'Toggle Sidebar' }).find((button) => button.dataset.slot === 'sidebar-trigger')
    await expect(trigger).toBeVisible()
    // On a desktop window the list is docked and in view.
    if (window.innerWidth >= 768) await expect(canvas.getByRole('navigation', { name: 'Past chats' })).toBeVisible()
  },
}

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

// An app that does more than keep the list: it can close the list as it deletes, apply a pin late, or drop a chat
// behind the list's back (another tab, a sync).
function Staged({ closeOnDelete, pinAfter, hideable, slowDelete, ...args }: Args & { closeOnDelete?: boolean; pinAfter?: number; hideable?: boolean; slowDelete?: boolean }) {
  const [chats, setChats] = React.useState(CHATS)
  const [here, setHere] = React.useState(true)
  const [shown, setShown] = React.useState(true)
  const list = (
    <ConversationHistory {...args} now={NOW} conversations={chats} currentId="b"
      onPin={(id, pinned) => {
        const apply = () => setChats((all) => all.map((chat) => (chat.id === id ? { ...chat, pinned } : chat)))
        if (pinAfter) window.setTimeout(apply, pinAfter)
        else apply()
        args.onPin?.(id, pinned)
      }}
      onDelete={(id) => {
        // A slow app asks its server first and drops the chat when the answer comes; here, never.
        if (!slowDelete) setChats((all) => all.filter((chat) => chat.id !== id))
        if (closeOnDelete) setHere(false)
        args.onDelete?.(id)
      }} />
  )
  return (
    <div className="grid gap-3">
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setHere(false)}>Leave</Button>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setShown((was) => !was)}>{shown ? 'Hide' : 'Show'}</Button>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setChats((all) => all.filter((chat) => chat.id !== 'c'))}>Remove elsewhere</Button>
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setChats((all) => all.map((chat) => (chat.id === 'd' ? { ...chat, updatedAt: NOW } : chat)))}>Bump elsewhere</Button>
      </div>
      {here ? (hideable ? <React.Activity mode={shown ? 'visible' : 'hidden'}>{list}</React.Activity> : list) : <p>Gone</p>}
    </div>
  )
}

// One confirmed delete is reported once, however the list goes away afterwards.
// The app closes the list in the same update that removes the chat: the list is unmounted without drawing again.
export const DeleteThatClosesTheList: Story = {
  args: { undoSeconds: 0.2 },
  render: (args) => <Staged {...args} closeOnDelete />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    canvas.getByRole('button', { name: 'New chat' }).focus()
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await pause(300)
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
  },
}

// A second delete settles the first; if that closes the list, the second is still owed, and the first is not sent twice.
export const SecondDeleteThatClosesTheList: Story = {
  render: (args) => <Staged {...args} closeOnDelete />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    await canvas.findByRole('button', { name: 'Undo' })
    await confirmDelete(canvas, 'Pricing page copy ideas')
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await pause(100)
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c'], ['d']])
  },
}

// Hidden by React's <Activity> (a tab the app keeps alive): hiding settles the delete, showing again must not repeat it.
export const HiddenThenShownAgain: Story = {
  args: { undoSeconds: 0.2 },
  render: (args) => <Staged {...args} hideable />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    await canvas.findByRole('button', { name: 'Undo' })
    await userEvent.click(canvas.getByRole('button', { name: 'Hide' }))
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
    await userEvent.click(canvas.getByRole('button', { name: 'Show' }))
    await expect(await canvas.findByRole('navigation', { name: 'Past chats' })).toBeVisible()
    await pause(500)
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
    await expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull()
  },
}

// Closing the tab runs no React cleanup, and with the cursor on Undo the countdown has not even started.
export const ClosingTheTabCommits: Story = {
  render: (args) => <Staged {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    await expect(args.onDelete).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('pagehide'))
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
    // A page restored from the back-forward cache, or the list going away later, does not send it again.
    window.dispatchEvent(new Event('pagehide'))
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }))
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
  },
}

// What the browser reports for a tab sent to the background. A phone that later kills that tab may never send
// `pagehide`, so this is the last moment the list is sure to hear about.
const reportVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}
// Removing the stand-in uncovers the browser's own reading again.
const restoreVisibility = () => { delete (document as unknown as { visibilityState?: string }).visibilityState }

// The page being hidden sends a confirmed delete, as closing it does: once, and Undo goes with it.
export const HidingThePageCommits: Story = {
  render: (args) => <Staged {...args} slowDelete />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    try {
      // The event alone is not "hidden": a tab that comes back to the front sends it too.
      reportVisibility('visible')
      await pause(50)
      await expect(args.onDelete).not.toHaveBeenCalled()
      await expect(canvas.getByRole('button', { name: 'Undo' })).toBeVisible()
      reportVisibility('hidden')
      await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
      await waitFor(() => expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull())
      await expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toBeVisible()
      await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
      // Hidden again, shown again, then closed: nothing more is sent.
      reportVisibility('hidden')
      reportVisibility('visible')
      window.dispatchEvent(new Event('pagehide'))
    } finally {
      restoreVisibility()
    }
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }))
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
  },
}

// The app drops the chat while its Undo line is showing (deleted in another tab). The delete was confirmed here, so
// the app is still told, once, and the Undo line does not linger with a countdown nothing can restart.
export const AppRemovesThePendingChat: Story = {
  render: (args) => <Staged {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    // Not a press: the cursor stays on Undo, so the countdown is held when the row goes.
    canvas.getByRole('button', { name: 'Remove elsewhere' }).click()
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull())
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }))
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
  },
}

// The app drops the chat while the dialog is still asking: confirming has nothing left to delete.
export const ConfirmAfterTheChatIsGone: Story = {
  render: (args) => <Staged {...args} />,
  play: async ({ canvas, args }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Delete' }))
    const dialog = await page().findByRole('alertdialog', { name: 'Delete this chat?' })
    // The page behind a modal dialog is hidden from assistive technology, so the button is asked for as hidden.
    canvas.getByRole('button', { name: 'Remove elsewhere', hidden: true }).click()
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Launch brief draft', hidden: true })).toBeNull())
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(page().queryByRole('alertdialog')).toBeNull())
    await expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull()
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }))
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await expect(args.onDelete).not.toHaveBeenCalled()
  },
}

// The app saves the pin first and moves the row a moment later: the cursor is still carried to the moved row.
export const PinAppliedLater: Story = {
  render: (args) => <Staged {...args} pinAfter={300} />,
  play: async ({ canvas }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Pin' }))
    await waitFor(() => expect(within(canvas.getByRole('list', { name: 'Pinned' })).getByText('Launch brief draft')).toBeVisible(), { timeout: 3000 })
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toHaveFocus())
  },
}

// Never pulled away from where the person went in the meantime.
export const PinAppliedLaterLeavesFocusAlone: Story = {
  render: (args) => <Staged {...args} pinAfter={300} />,
  play: async ({ canvas }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Pin' }))
    const newChat = canvas.getByRole('button', { name: 'New chat' })
    await userEvent.click(newChat)
    await waitFor(() => expect(within(canvas.getByRole('list', { name: 'Pinned' })).getByText('Launch brief draft')).toBeVisible(), { timeout: 3000 })
    await pause(100)
    await expect(newChat).toHaveFocus()
  },
}

// The usage guide says to open this list in the app's own sheet. Escape and Enter in the rename field belong to the
// field: they must not also close the sheet around it.
export const RenameInsideASheet: Story = {
  render: (args) => (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>Past chats</SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Chats</SheetTitle>
          <SheetDescription>Pick up an earlier conversation.</SheetDescription>
        </SheetHeader>
        <div className="px-2"><Owned {...args} className={undefined} /></div>
      </SheetContent>
    </Sheet>
  ),
  play: async ({ canvas, args }) => {
    // Opened by a press, so the Docs page shows the button and not a sheet over the whole page.
    await userEvent.click(canvas.getByRole('button', { name: 'Past chats' }))
    const sheet = await page().findByRole('dialog', { name: 'Chats' })
    const inSheet = within(sheet)
    await waitFor(() => expect(inSheet.getByRole('button', { name: 'Launch brief draft' })).toBeVisible())
    await userEvent.click(await within(await openMenu(inSheet, 'Launch brief draft')).findByRole('menuitem', { name: 'Rename' }))
    const field = await inSheet.findByRole('textbox', { name: 'Rename Launch brief draft' })
    await waitFor(() => expect(field).toHaveFocus())
    await userEvent.keyboard(' changed{Escape}')
    // Cancelled, the sheet still open, the cursor back on the row.
    const row = await inSheet.findByRole('button', { name: 'Launch brief draft' })
    await waitFor(() => expect(row).toHaveFocus())
    await pause(350)
    await expect(page().getByRole('dialog', { name: 'Chats' })).toBeVisible()
    await expect(args.onRename).not.toHaveBeenCalled()
    // Enter saves, and the sheet stays.
    await userEvent.click(await within(await openMenu(inSheet, 'Launch brief draft')).findByRole('menuitem', { name: 'Rename' }))
    await waitFor(() => expect(inSheet.getByRole('textbox', { name: 'Rename Launch brief draft' })).toHaveFocus())
    await userEvent.keyboard('Launch brief v3{Enter}')
    await waitFor(() => expect(inSheet.getByRole('button', { name: 'Launch brief v3' })).toHaveFocus())
    await expect(args.onRename).toHaveBeenCalledWith('c', 'Launch brief v3')
    await expect(page().getByRole('dialog', { name: 'Chats' })).toBeVisible()
    // Close it, so the a11y scan that follows reads the page and not a modal's focus guards.
    await userEvent.click(inSheet.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(page().queryByRole('dialog')).toBeNull())
  },
}

// Safari confirms an input-method word with Enter, isComposing false and keyCode 229: that is not "save".
export const RenameIgnoresEnterKeyCode229: Story = {
  render: (args) => <Owned {...args} />,
  play: async ({ canvas, args }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Rename' }))
    const field = await canvas.findByRole('textbox', { name: 'Rename Launch brief draft' })
    await waitFor(() => expect(field).toHaveFocus())
    await userEvent.keyboard('ni')
    const evt = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true })
    if (evt.keyCode !== 229) Object.defineProperty(evt, 'keyCode', { get: () => 229 })
    field.dispatchEvent(evt)
    await pause(50)
    await expect(args.onRename).not.toHaveBeenCalled()
    await expect(canvas.getByRole('textbox', { name: 'Rename Launch brief draft' })).toHaveFocus()
    // A real Enter still saves.
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(args.onRename).toHaveBeenCalledWith('c', 'ni'))
  },
}

// The server and the browser must put each chat in the same group, whatever zone each of them runs in.
export const SameGroupsInAnyTimeZone: Story = {
  args: { now: new Date('not a date') },
  play: async ({ canvasElement }) => {
    const now = new Date('2026-10-05T02:00:00Z')
    const evening: Conversation[] = [{ id: 'x', title: 'This evening', updatedAt: '2026-10-04T20:00:00Z' }]
    const labels = (chats: Conversation[], zone?: string) => groupConversations(chats, now, 'en-US', zone).map((group) => group.label)
    await expect(labels(evening, 'America/Los_Angeles')).toEqual(['Today'])
    await expect(labels(evening, 'UTC')).toEqual(['Yesterday'])
    const monthEdge: Conversation[] = [{ id: 'y', title: 'Month edge', updatedAt: '2026-09-01T03:00:00Z' }]
    await expect(labels(monthEdge, 'America/Los_Angeles')).toEqual(['August 2026'])
    await expect(labels(monthEdge, 'UTC')).toEqual(['September 2026'])
    // A zone name that is not one falls back to the runtime's own zone instead of throwing.
    await expect(labels(evening, 'Mars/Olympus_Mons')).toEqual(labels(evening))
    // A `now` that is not a date falls back to the moment the list was first drawn: the sample still reads by day.
    await expect(groupLabels(canvasElement)).toEqual(['Pinned', 'Today', 'Yesterday', 'Previous 7 days'])
  },
}

// The prop reaches the list: the same chat is under Today for a person in Los Angeles and Yesterday for one in UTC.
export const TimeZoneProp: Story = {
  render: (args) => (
    <div className="grid gap-4">
      {['America/Los_Angeles', 'UTC'].map((zone) => (
        <ConversationHistory key={zone} className={args.className} label={zone} timeZone={zone} now={new Date('2026-10-05T02:00:00Z')}
          conversations={[{ id: 'x', title: 'This evening', updatedAt: '2026-10-04T20:00:00Z' }]} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(within(canvas.getByRole('navigation', { name: 'America/Los_Angeles' })).getByRole('list', { name: 'Today' })).toBeVisible()
    await expect(within(canvas.getByRole('navigation', { name: 'UTC' })).getByRole('list', { name: 'Yesterday' })).toBeVisible()
  },
}

// Zero commits as soon as nothing holds the line. A negative number, or one that is not a number, is not a time at
// all: it is treated as the default six seconds instead of deleting at once.
export const UndoSecondsEdges: Story = {
  render: (args) => (
    <div className="grid gap-4">
      <ConversationHistory className={args.className} label="Zero" now={NOW} undoSeconds={0} conversations={[CHATS[1]]} onDelete={args.onDelete} />
      <ConversationHistory className={args.className} label="Negative" now={NOW} undoSeconds={-3} conversations={[CHATS[2]]} onDelete={args.onDelete} />
      <ConversationHistory className={args.className} label="Not a number" now={NOW} undoSeconds={Number.NaN} conversations={[CHATS[3]]} onDelete={args.onDelete} />
    </div>
  ),
  play: async ({ canvas, args }) => {
    for (const [list, title] of [['Zero', 'Q3 signups vs target'], ['Negative', 'Launch brief draft'], ['Not a number', 'Pricing page copy ideas']]) {
      await confirmDelete(canvas, title)
      const undo = await within(canvas.getByRole('navigation', { name: list })).findByRole('button', { name: 'Undo' })
      await waitFor(() => expect(undo).toHaveFocus())
      // Held while the cursor is on the line, whatever the number.
      await pause(150)
      undo.blur()
      if (list === 'Zero') await waitFor(() => expect(args.onDelete).toHaveBeenCalledWith('b'))
      else await pause(500)
      await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['b']])
      await waitFor(() => expect(page().queryByRole('alertdialog')).toBeNull())
    }
  },
}

// Cmd, Ctrl, Shift or Alt with a press on a link row opens the chat in a new tab or window; this page's open chat
// has not changed, so the app is not told it did.
export const ModifierClickOnALink: Story = {
  args: LongAndLinked.args,
  play: async ({ canvas, args }) => {
    const link = canvas.getByRole('link', { name: 'Opens as a link' })
    link.addEventListener('click', (event) => event.preventDefault())
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) await fireEvent.click(link, { [modifier]: true })
    await expect(args.onSelect).not.toHaveBeenCalled()
    await fireEvent.click(link)
    await expect(args.onSelect).toHaveBeenCalledWith('link')
  },
}

// Once the app has been told, Undo would be a lie: it could not bring the chat back. For an app that drops the chat
// only when its server answers, the chat is an ordinary row again until then.
export const UndoAfterThePageWasHidden: Story = {
  render: (args) => <Staged {...args} slowDelete />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    // The tab is hidden (and later comes back from the back-forward cache).
    window.dispatchEvent(new Event('pagehide'))
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toBeVisible()
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
    await userEvent.click(canvas.getByRole('button', { name: 'Leave' }))
    await expect(await canvas.findByText('Gone')).toBeVisible()
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
  },
}

export const UndoAfterTheListWasHidden: Story = {
  render: (args) => <Staged {...args} slowDelete hideable />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Launch brief draft')
    await canvas.findByRole('button', { name: 'Undo' })
    await userEvent.click(canvas.getByRole('button', { name: 'Hide' }))
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1))
    await userEvent.click(canvas.getByRole('button', { name: 'Show' }))
    await expect(await canvas.findByRole('navigation', { name: 'Past chats' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Undo' })).toBeNull()
    await expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toBeVisible()
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['c']])
  },
}

// The app moves the chat to another group while its Undo line is showing (a sync bumps its date). The line is drawn
// afresh there: it keeps the cursor it had, and once nothing holds it the countdown still runs out.
export const PendingChatRegrouped: Story = {
  args: { undoSeconds: 0.3 },
  render: (args) => <Staged {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Pricing page copy ideas')
    const first = await within(canvas.getByRole('list', { name: 'Yesterday' })).findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(first).toHaveFocus())
    // Not a press: the cursor stays on Undo while the row moves under it.
    canvas.getByRole('button', { name: 'Bump elsewhere' }).click()
    const today = canvas.getByRole('list', { name: 'Today' })
    await waitFor(() => expect(within(today).getByText(/Deleted .Pricing page copy ideas./)).toBeVisible())
    const moved = within(today).getByRole('button', { name: 'Undo' })
    await waitFor(() => expect(moved).toHaveFocus())
    // Still held by the cursor, in its new place.
    await pause(600)
    await expect(args.onDelete).not.toHaveBeenCalled()
    canvas.getByRole('button', { name: 'New chat' }).focus()
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1), { timeout: 3000 })
    await pause(400)
    await expect((args.onDelete as ReturnType<typeof fn>).mock.calls).toEqual([['d']])
  },
}

// The same move with nothing on the line but a pointer that was resting there: the row that moved away sends no
// "pointer left", and the countdown must not wait for one.
export const PendingChatRegroupedUnderThePointer: Story = {
  args: { undoSeconds: 0.3 },
  render: (args) => <Staged {...args} />,
  play: async ({ canvas, args }) => {
    await confirmDelete(canvas, 'Pricing page copy ideas')
    const undo = await canvas.findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(undo).toHaveFocus())
    await userEvent.hover(undo)
    canvas.getByRole('button', { name: 'New chat' }).focus()
    await pause(600)
    await expect(args.onDelete).not.toHaveBeenCalled()
    canvas.getByRole('button', { name: 'Bump elsewhere' }).click()
    await waitFor(() => expect(args.onDelete).toHaveBeenCalledTimes(1), { timeout: 3000 })
    await expect(args.onDelete).toHaveBeenCalledWith('d')
  },
}

// Shift, Control, Alt or Meta pressed alone is not "moving on": it starts a shortcut or does nothing. The Undo line
// the app then moves to another group still keeps the cursor.
export const BareModifierKeepsFollowingUndo: Story = {
  render: (args) => <Staged {...args} />,
  play: async ({ canvas }) => {
    await confirmDelete(canvas, 'Pricing page copy ideas')
    const first = await within(canvas.getByRole('list', { name: 'Yesterday' })).findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(first).toHaveFocus())
    await userEvent.keyboard('{Shift}{Control}{Alt}{Meta}')
    await expect(first).toHaveFocus()
    // Not a press: the cursor stays on Undo while the row moves under it.
    canvas.getByRole('button', { name: 'Bump elsewhere' }).click()
    const today = canvas.getByRole('list', { name: 'Today' })
    await waitFor(() => expect(within(today).getByText(/Deleted .Pricing page copy ideas./)).toBeVisible())
    await waitFor(() => expect(within(today).getByRole('button', { name: 'Undo' })).toHaveFocus())
  },
}

// The same for a row being pinned by an app that applies the pin late.
export const BareModifierKeepsFollowingAPinnedRow: Story = {
  render: (args) => <Staged {...args} pinAfter={600} />,
  play: async ({ canvas }) => {
    await userEvent.click(await within(await openMenu(canvas, 'Launch brief draft')).findByRole('menuitem', { name: 'Pin' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toHaveFocus())
    await userEvent.keyboard('{Shift}')
    await waitFor(() => expect(within(canvas.getByRole('list', { name: 'Pinned' })).getByText('Launch brief draft')).toBeVisible(), { timeout: 3000 })
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Launch brief draft' })).toHaveFocus())
  },
}

// Any other key is the person moving on, and still ends the following.
export const AnotherKeyEndsFollowing: Story = {
  render: (args) => <Staged {...args} />,
  play: async ({ canvas }) => {
    await confirmDelete(canvas, 'Pricing page copy ideas')
    const first = await within(canvas.getByRole('list', { name: 'Yesterday' })).findByRole('button', { name: 'Undo' })
    await waitFor(() => expect(first).toHaveFocus())
    await userEvent.keyboard('a')
    canvas.getByRole('button', { name: 'Bump elsewhere' }).click()
    const today = canvas.getByRole('list', { name: 'Today' })
    await waitFor(() => expect(within(today).getByText(/Deleted .Pricing page copy ideas./)).toBeVisible())
    await pause(100)
    await expect(within(today).getByRole('button', { name: 'Undo' })).not.toHaveFocus()
  },
}
