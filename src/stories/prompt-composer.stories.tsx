import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { PromptComposer } from '../../registry/lib/prompt-composer'
import { usage } from '@/usage/prompt-composer.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, unlessDoDont } from './DoDont'
import { Icon } from '@/components/ui/icon'

const meta = {
  title: 'Components / PromptComposer',
  component: PromptComposer,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: renderUsageDocs(usage) } } },
  args: { onSubmit: fn(), onStop: fn() },
  argTypes: {
    size: { control: 'select', options: ['lg', 'sm'] },
    status: { control: 'select', options: ['idle', 'working', 'disabled', 'error'] },
  },
  // Every story frames the composer the same way: centred across and down the canvas at one width. On a story
  // page the frame fills the screen, less the preview's 24px padding; on the Docs page each example keeps its own
  // height. The / and @ menu has room to open upward from the centre.
  // The Do/Don't pair steps aside (unlessDoDont): it needs the whole canvas, not a max-w-xl column.
  decorators: [unlessDoDont((Story, { viewMode }) => (
    <div className={viewMode === 'story' ? 'grid min-h-[calc(100vh-3rem)] place-items-center p-4' : 'grid place-items-center p-4'}>
      <div className="mx-auto w-full max-w-xl"><Story /></div>
    </div>
  ))],
} satisfies Meta<typeof PromptComposer>

export default meta
type Story = StoryObj<typeof meta>

export const Large: Story = { args: { size: 'lg', placeholder: 'Ask anything' } }
export const Small: Story = { args: { size: 'sm', placeholder: 'Ask about this account' } }

export const SendsOnEnter: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '   ')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).not.toHaveBeenCalled() // whitespace never sends
    await userEvent.clear(box)
    await userEvent.type(box, 'Summarize my week')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    await expect(args.onSubmit).not.toHaveBeenCalled() // Shift+Enter is a new line
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledWith('Summarize my week\n')
  },
}

export const IgnoresEnterWhileComposing: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, 'ni')
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

export const IgnoresEnterKeyCode229: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, 'ni')
    // WebKit confirms an IME word with Enter, isComposing false and keyCode 229.
    const evt = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true })
    if (evt.keyCode !== 229) Object.defineProperty(evt, 'keyCode', { get: () => 229 })
    box.dispatchEvent(evt)
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

// Real input methods announce their pop-up of candidate words with composition events, and the
// Enter that confirms a word must never send. Chrome delivers that Enter while the pop-up is
// open; Safari delivers it right after the pop-up closes. These replay both orders with a plain
// Enter (no isComposing, no keyCode 229), so the composer has to track the pop-up itself.
const pressEnter = (box: HTMLElement) =>
  box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }))
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const IgnoresEnterWhilePopUpIsOpen: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, 'nihon')
    box.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    pressEnter(box)
    await expect(args.onSubmit).not.toHaveBeenCalled()
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'nihon' }))
    await wait(200)
    pressEnter(box) // pop-up closed a while ago: this Enter means send
    await expect(args.onSubmit).toHaveBeenCalledWith('nihon')
  },
}

export const IgnoresEnterRightAfterPopUpCloses: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, 'nihon')
    box.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'nihon' }))
    pressEnter(box) // Safari's order: the confirming Enter lands just after the pop-up closes
    await expect(args.onSubmit).not.toHaveBeenCalled()
  },
}

export const SlashMenuIgnoresConfirmingEnter: Story = {
  args: {
    size: 'sm',
    commands: [{ value: 'summarize', label: '/summarize', description: 'Condense a doc or thread', trigger: '/', ai: true }],
    onCommand: fn(),
  },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '/su')
    await canvas.findByRole('option', { name: /summarize/ })
    box.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    pressEnter(box)
    box.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    pressEnter(box)
    await expect(args.onCommand).not.toHaveBeenCalled()
  },
}

export const Working: Story = {
  args: { status: 'working', defaultValue: 'Draft the Q3 summary' },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: 'Message' }))
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).not.toHaveBeenCalled() // never sends while working
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    await expect(args.onStop).toHaveBeenCalledOnce()
  },
}

export const Disabled: Story = {
  args: { status: 'disabled', placeholder: 'Assistant is offline' },
  play: async ({ canvas }) => {
    // The whole box fades as one piece; the text area adds no grey patch or second fade of its own.
    const textbox = canvas.getByRole('textbox', { name: 'Message' })
    await expect(textbox).toBeDisabled()
    await expect(getComputedStyle(textbox).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    await expect(getComputedStyle(textbox).opacity).toBe('1')
    const box = textbox.closest('[data-slot="prompt-composer"]') as HTMLElement
    await expect(getComputedStyle(box).opacity).toBe('0.5') // opacity-disabled, like every disabled control (1.31.0)
  },
}

export const ErrorState: Story = {
  args: { status: 'error', error: "Couldn't reach the assistant. Try again in a moment.", defaultValue: 'Summarize this' },
  play: async ({ canvas }) => {
    const alert = canvas.getByRole('alert')
    await expect(alert).toHaveTextContent("Couldn't reach the assistant")
    // The message leads with the error icon (a circle with !).
    await expect(alert.firstElementChild?.tagName.toLowerCase()).toBe('svg')
  },
}

export const WithMic: Story = {
  args: { onMic: fn() },
  play: async ({ canvas }) => {
    // One Material size up from the 16px send arrow: the mic's thin outline reads small at 16px.
    const glyph = canvas.getByRole('button', { name: 'Dictate' }).querySelector('svg') as SVGElement
    await expect(glyph.getBoundingClientRect().width).toBe(20)
  },
}

export const WithAttachments: Story = {
  args: {
    defaultValue: 'Compare signups against the targets in the deck.',
    attachments: [
      { id: 'a1', name: 'Q3 board deck.pdf', meta: '2.4 MB', kind: 'PDF' },
      { id: 'a2', name: 'signups-sept.csv', meta: '812 rows', kind: 'CSV' },
    ],
    tools: [{ id: 't1', label: 'Analyze data' }],
    onRemoveAttachment: fn(),
    onRemoveTool: fn(),
    onFilesDropped: fn(),
  },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Q3 board deck.pdf' }))
    await expect(args.onRemoveAttachment).toHaveBeenCalledWith('a1')
    await userEvent.click(canvas.getByRole('button', { name: 'Turn off Analyze data' }))
    await expect(args.onRemoveTool).toHaveBeenCalledWith('t1')
  },
}

export const WithModes: Story = {
  args: {
    modes: [
      { value: 'ask', label: 'Ask', ai: true, placeholder: 'Ask anything. Type / for skills, @ to add context' },
      { value: 'agent', label: 'Agent', icon: <Icon name="person" />, placeholder: 'What should your agent take on?' },
    ],
    onModeChange: fn(),
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('tab', { name: 'Ask', selected: true })).toBeVisible()
    // A non-AI mode shows its own icon (the person for Agent); the AI mode shows the mark.
    await expect(canvas.getByRole('tab', { name: 'Agent' }).querySelector('svg')).not.toBeNull()
    await userEvent.click(canvas.getByRole('tab', { name: 'Agent' }))
    await expect(args.onModeChange).toHaveBeenCalledWith('agent')
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toHaveAttribute('placeholder', 'What should your agent take on?')
  },
}

export const TabsTurnedOff: Story = {
  args: {
    showModes: false,
    modes: [
      { value: 'ask', label: 'Ask', ai: true },
      { value: 'agent', label: 'Agent', icon: <Icon name="person" /> },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('tablist')).toBeNull()
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toBeVisible()
  },
}

// Pins the approved sketch's shape: Quill's radius scale is larger than Tailwind's default
// (xl = 16px, 2xl = 24px), and shipping 2xl made the box visibly rounder than approved.
export const MatchesApprovedShape: Story = {
  args: {
    modes: [
      { value: 'ask', label: 'Ask', ai: true },
      { value: 'agent', label: 'Agent', icon: <Icon name="person" /> },
    ],
  },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' }).closest('[data-slot="prompt-composer"]') as HTMLElement
    await expect(getComputedStyle(box).borderTopLeftRadius).toBe('16px')
    const tab = canvas.getByRole('tab', { name: 'Ask' })
    await expect(getComputedStyle(tab).borderTopLeftRadius).toBe('8px')
    // The selected tab flares into the box: no bottom border of its own (its ends used to poke past the base), and a
    // curved piece at each base corner where its sides meet the box edge. Unselected tabs have neither.
    await expect(getComputedStyle(tab).borderBottomWidth).toBe('0px')
    await expect(tab.querySelectorAll('[data-slot="tab-fillet"]')).toHaveLength(2)
    // An unselected tab still reads as a tab: a subtle muted fill with the same 8px top corners,
    // plus a hairline outline, because the fill alone vanishes on the dark themes.
    const other = canvas.getByRole('tab', { name: 'Agent' })
    await expect(getComputedStyle(other).backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    await expect(getComputedStyle(other).borderTopLeftRadius).toBe('8px')
    await expect(getComputedStyle(other).borderTopWidth).toBe('1px')
    await expect(getComputedStyle(other).borderBottomWidth).toBe('0px')
    await expect(other.querySelectorAll('[data-slot="tab-fillet"]')).toHaveLength(0)
  },
}

export const SlashCommands: Story = {
  args: {
    size: 'sm',
    commands: [
      { value: 'summarize', label: '/summarize', description: 'Condense a doc or thread', trigger: '/', ai: true },
      { value: 'remind', label: '/remind', description: 'Set a reminder', trigger: '/' },
      { value: 'q3-deck', label: 'Q3 board deck', description: 'Document', trigger: '@' },
    ],
    onCommand: fn(),
  },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '/su')
    const option = await canvas.findByRole('option', { name: /summarize/ })
    await userEvent.keyboard('{Enter}')
    await expect(args.onCommand).toHaveBeenCalledWith(expect.objectContaining({ value: 'summarize' }))
    await expect(box).toHaveValue('/summarize ')
    await expect(args.onSubmit).not.toHaveBeenCalled() // Enter picked the command, it did not send
    void option
  },
}

export const MenuAnnouncesActiveOption: Story = {
  args: {
    size: 'sm',
    commands: [
      { value: 'summarize', label: '/summarize', trigger: '/' },
      { value: 'remind', label: '/remind', trigger: '/' },
    ],
  },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '/')
    const options = await canvas.findAllByRole('option')
    await waitFor(() => expect(box).toHaveAttribute('aria-activedescendant', options[0].id))
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(box).toHaveAttribute('aria-activedescendant', options[1].id))
    await expect(options[1]).toHaveAttribute('aria-selected', 'true')
    await expect(box).not.toHaveAttribute('aria-expanded')
  },
}

// A composer at the top of a panel that clips its content (a side panel, say) has no room above, so the menu opens
// below instead of being cut off. The panel is unstyled (only its clipping matters here); its padding keeps the
// shadows inside the clip, and the negative margin keeps the composer the same width as every other story.
export const MenuFlipsBelowNearTheTop: Story = {
  render: (args) => (
    <div data-testid="panel" className="-mx-3 h-80 overflow-y-auto p-3">
      <PromptComposer {...args} />
    </div>
  ),
  args: {
    size: 'sm',
    commands: [
      { value: 'summarize', label: '/summarize', description: 'Condense a doc or thread', trigger: '/', ai: true },
      { value: 'remind', label: '/remind', description: 'Set a reminder', trigger: '/' },
    ],
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), '/')
    await canvas.findAllByRole('option')
    const menu = canvasElement.querySelector('[cmdk-root]') as HTMLElement
    await waitFor(() => expect(menu).toHaveAttribute('data-side', 'bottom'))
    const panel = canvas.getByTestId('panel').getBoundingClientRect()
    const box = menu.getBoundingClientRect()
    await expect(box.top).toBeGreaterThanOrEqual(panel.top)
    await expect(box.bottom).toBeLessThanOrEqual(panel.bottom)
  },
}

// With room above, the menu keeps its usual place over the content above the composer.
export const MenuOpensAboveWithRoom: Story = {
  args: MenuFlipsBelowNearTheTop.args,
  play: async ({ canvas, canvasElement }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), '/')
    await canvas.findAllByRole('option')
    const menu = canvasElement.querySelector('[cmdk-root]') as HTMLElement
    await waitFor(() => expect(menu).toHaveAttribute('data-side', 'top'))
    await expect(menu.getBoundingClientRect().top).toBeGreaterThanOrEqual(0)
  },
}

export const ClickingAnOptionKeepsFocus: Story = {
  args: {
    size: 'sm',
    commands: [{ value: 'summarize', label: '/summarize', trigger: '/' }],
    onCommand: fn(),
  },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '/')
    await userEvent.click(await canvas.findByRole('option', { name: /summarize/ }))
    await expect(args.onCommand).toHaveBeenCalled()
    await expect(box).toHaveValue('/summarize ')
    await expect(box).toHaveFocus()
  },
}

const ALL_COMMANDS = [
  { value: 'summarize', label: '/summarize', trigger: '/' as const },
  { value: 'remind', label: '/remind', trigger: '/' as const },
  { value: 'search', label: '/search', trigger: '/' as const },
]

export const MenuShrinksUnderTheCursor: Story = {
  args: { size: 'sm', onCommand: fn() },
  render: (args) => {
    const [commands, setCommands] = React.useState(ALL_COMMANDS)
    return (
      <>
        <PromptComposer {...args} commands={commands} />
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setCommands(ALL_COMMANDS.slice(0, 2))}>Fewer commands</Button>
      </>
    )
  },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '/')
    await canvas.findAllByRole('option')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}') // last of three
    await userEvent.click(canvas.getByRole('button', { name: 'Fewer commands' }))
    box.focus()
    await userEvent.keyboard('{Enter}') // must not throw: the active index was past the end
    // The list changed, so the highlight went back to the first remaining option.
    await expect(args.onCommand).toHaveBeenCalledWith(expect.objectContaining({ value: 'summarize' }))
  },
}

export const EscapeClosesMenuKeepsText: Story = {
  args: { size: 'sm', commands: ALL_COMMANDS },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '/su')
    await canvas.findByRole('option', { name: /summarize/ })
    await userEvent.keyboard('{Escape}')
    await expect(box).toHaveValue('/su') // the person's text is never changed to close the menu
    await waitFor(() => expect(canvas.queryByRole('option')).toBeNull())
    await userEvent.type(box, 'm')
    await expect(await canvas.findByRole('option', { name: /summarize/ })).toBeVisible() // typing reopens it
  },
}

export const SendKeepsFocus: Story = {
  args: { size: 'sm' },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, 'Summarize my week')
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }))
    await expect(args.onSubmit).toHaveBeenCalledWith('Summarize my week')
    // Send is now disabled (the box is empty); focus must come back to the box, not drop to the page.
    await expect(box).toHaveFocus()
  },
}

const drag = (target: Element, type: 'dragover' | 'dragleave', relatedTarget?: EventTarget | null) =>
  target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, relatedTarget: relatedTarget ?? null }))

export const DropHintSurvivesMovingOntoChildren: Story = {
  args: { onFilesDropped: fn() },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    const target = box.closest('[data-slot="prompt-composer"]') as HTMLElement
    drag(target, 'dragover')
    await expect(await canvas.findByText('Drop files to attach')).toBeVisible()
    // The pointer moved from the box onto the textarea inside it: still dragging over the box.
    drag(target, 'dragleave', box)
    await new Promise((resolve) => setTimeout(resolve, 50)) // let React re-render before looking
    await expect(canvas.getByText('Drop files to attach')).toBeVisible()
    // Leaving the box for the page ends it.
    drag(target, 'dragleave', document.body)
    await waitFor(() => expect(canvas.queryByText('Drop files to attach')).toBeNull())
  },
}

export const DisabledIgnoresDrops: Story = {
  args: { status: 'disabled', onFilesDropped: fn() },
  play: async ({ canvas, args }) => {
    const target = canvas.getByRole('textbox', { name: 'Message' }).closest('[data-slot="prompt-composer"]') as HTMLElement
    const accepted = !drag(target, 'dragover') // preventDefault on dragover is what makes an element a drop target
    await expect(accepted).toBe(false)
    await expect(canvas.queryByText('Drop files to attach')).toBeNull()
    await expect(args.onFilesDropped).not.toHaveBeenCalled()
  },
}

export const AutoFocus: Story = {
  args: { size: 'sm', autoFocus: true },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Message' })).toHaveFocus())
  },
}

export const Notebook: Story = {
  args: { variant: 'notebook', placeholder: 'Start writing what you need…' },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    const page = canvas.getByRole('textbox', { name: 'Message' }).closest('[data-slot="prompt-composer"]') as HTMLElement
    // Focus must be visible without the AI edge: the page's border or shadow changes.
    const before = getComputedStyle(page)
    const [borderBefore, shadowBefore] = [before.borderTopColor, before.boxShadow]
    await userEvent.type(box, 'Write a launch brief for the October release')
    await expect(canvas.getByText('8 words')).toBeVisible()
    // Visible, not announced: a live region would read the count after every word.
    await expect(canvas.getByText('8 words').closest('[aria-live]')).toBeNull()
    const after = getComputedStyle(page)
    await expect(after.borderTopColor !== borderBefore || after.boxShadow !== shadowBefore).toBe(true)
    // The ruling is drawn on the textarea: its offset must equal the top padding, and lines are 32px, or text and rules drift apart.
    const style = getComputedStyle(box)
    await expect(style.lineHeight).toBe('32px')
    await expect(style.backgroundPositionY).toBe(style.paddingTop)
    await expect(style.backgroundAttachment).toContain('local')
  },
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: (args) => (
    <div className="grid gap-6">
      <DoDontPair usage={usage} id="edge-not-ring"
        doExample={<PromptComposer {...args} size="sm" />}
        dontExample={<div className="rounded-3xl p-1.5" style={{ background: 'linear-gradient(115deg, var(--ai-from), var(--ai-via), var(--ai-to))' }}><PromptComposer {...args} size="sm" /></div>} />
      <DoDontPair usage={usage} id="send-stays-solid"
        doExample={<PromptComposer {...args} size="sm" defaultValue="Draft a reply" />}
        dontExample={<div className="flex items-center gap-2 rounded-2xl border p-2"><span className="flex-1 text-sm">Draft a reply</span><span className="size-8 rounded-full" style={{ background: 'linear-gradient(115deg, var(--ai-from), var(--ai-via), var(--ai-to))' }} /></div>} />
    </div>
  ),
}
