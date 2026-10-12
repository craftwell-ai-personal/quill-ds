import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { AiChat } from '@registry/blocks/ai-chat'
import { ConversationHistory, type Conversation } from '@registry/blocks/conversation-history'
import { AiMessage, UserMessage, type AiFeedback } from '@/components/ui/ai-message'
import { AiThinking } from '@/components/ui/ai-thinking'
import { AgentSteps, type AgentStep } from '@/components/ui/agent-steps'
import { ApprovalCard } from '@/components/ui/approval-card'
import { QuestionCard, type QuestionOption } from '@/components/ui/question-card'
import { AiFeedbackForm } from '@/components/ui/ai-feedback'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/ai-chat.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { expectFocusRing, tabTo } from '../focus-ring'

const meta = {
  title: 'Patterns / AI / AI Chat',
  component: AiChat,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen', docs: { description: { component: renderUsageDocs(usage) } } },
  args: { onSubmit: fn() },
} satisfies Meta<typeof AiChat>

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
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('navigation', { name: 'Chats' })).toBeVisible()
    await expect(canvas.getByRole('region', { name: 'Conversation' })).toHaveTextContent('4% ahead')
    // On the full chat page nothing else says who is answering, so the reply keeps its visible name.
    const name = canvas.getByRole('log', { name: 'Messages' }).querySelector('[data-slot="reply-name"]') as HTMLElement
    await expect(name).toHaveTextContent('Assistant')
    await expect(name.getBoundingClientRect().height).toBe(28)
    await expect(name).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Q3 deck, source: Q3 board deck.pdf' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Compare with Q2' }))
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await expect(box).toHaveValue('Compare with Q2')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledWith('Compare with Q2')
    // Every reply carries a (usually empty) status region; the working one fills just after it mounts.
    await waitFor(() => expect(canvas.getAllByRole('status').some((region) => region.textContent?.includes('Reading signups-sept.csv'))).toBe(true))
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    await expect(canvas.getByText('You stopped this answer.')).toBeVisible()
    // Stop unmounts with the working state; the cursor must land back in the box, not on the page.
    await expect(box).toHaveFocus()
  },
}

export const ThreadIsALog: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvas }) => {
    // The log sits inside the named region (which also holds the composer) so new turns are announced politely.
    const region = canvas.getByRole('region', { name: 'Conversation' })
    const log = canvas.getByRole('log', { name: 'Messages' })
    await expect(region).toContainElement(log)
    await expect(log).toHaveTextContent('4% ahead')
    await expect(log).not.toContainElement(canvas.getByRole('textbox', { name: 'Message' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'Message' }), 'Compare with Q2{Enter}')
    await expect(log).toHaveTextContent('Compare with Q2')
  },
}
export const SidebarLinksShowFocusRing: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'desktop', isRotated: false } },
  play: async ({ canvas }) => {
    await expectFocusRing(canvas.getByRole('link', { name: 'Launch brief draft' }))
  },
}

export const Phone: Story = {
  parameters: { viewport: { options: VIEWPORTS } },
  globals: { viewport: { value: 'phone', isRotated: false } },
  play: async ({ canvas, canvasElement }) => {
    // A display:none nav has no accessible name, so role queries cannot find it; select it by its label.
    await expect(canvasElement.querySelector('nav[aria-label="Chats"]')).not.toBeVisible()
    await expect(canvas.getByRole('region', { name: 'Conversation' })).toBeVisible()
    await expect(window.innerWidth).toBeLessThanOrEqual(375)
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

// From here on the conversation is the app's own (CRA-279): `children` replaces the sample turns and follow-ups, and
// the sidebar and the composer's trailing slot take the app's own pieces.
const DESKTOP = { parameters: { viewport: { options: VIEWPORTS } }, globals: { viewport: { value: 'desktop', isRotated: false } } } as const

// `reply`: text is an answer, null is a stopped answer, undefined is one still being written.
type OwnTurn = { id: number; ask: string; reply?: string | null }
const OWN_TURNS: OwnTurn[] = [
  { id: 1, ask: 'Which plan do most new teams pick?', reply: 'Team, by a wide margin: 61% of September signups chose it, up from 48% in August.' },
  { id: 2, ask: 'Draft a nudge for the accounts that stay on Starter.' },
]
const ownTurn = (turn: OwnTurn) => (
  <React.Fragment key={turn.id}>
    <UserMessage>{turn.ask}</UserMessage>
    {turn.reply === undefined
      ? <AiMessage streaming thinking={<AiThinking status="working" activity="Checking the plan mix" />} />
      : turn.reply === null ? <AiMessage stopped /> : <AiMessage><p>{turn.reply}</p></AiMessage>}
  </React.Fragment>
)

// The app's side: it owns the turns and whether a reply is being written, and applies what the page reports.
function AppConversationPage({ args }: { args: Story['args'] }) {
  const [turns, setTurns] = React.useState(OWN_TURNS)
  const [status, setStatus] = React.useState<'idle' | 'working'>('working')
  return (
    <AiChat status={status}
      composerTrailing={<Button type="button" variant="ghost" size="sm" className="text-ink-soft">Add a file</Button>}
      onStop={() => { setTurns((all) => all.map((turn, index) => (index === all.length - 1 ? { ...turn, reply: null } : turn))); setStatus('idle'); args?.onStop?.() }}
      onSubmit={(text) => { setTurns((all) => [...all, { id: all.length + 1, ask: text }]); setStatus('working'); args?.onSubmit?.(text) }}>
      {turns.map(ownTurn)}
    </AiChat>
  )
}

export const AppConversation: Story = {
  ...DESKTOP,
  args: { onStop: fn() },
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'The app\'s own conversation, passed as children, with its own control in the composer in place of the sample model picker.' } } },
  render: (args) => <AppConversationPage args={args} />,
  play: async ({ canvas, args }) => {
    const log = canvas.getByRole('log', { name: 'Messages' })
    // None of the sample conversation is here: not its turns, not its sources, not its follow-ups.
    await expect(log).not.toHaveTextContent('4% ahead')
    await expect(log).not.toHaveTextContent('How did signups do against target this quarter?')
    await expect(canvas.queryByRole('list', { name: 'Follow-ups' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Compare with Q2' })).toBeNull()
    // The app's turns are, in the log; on the full page a reply keeps its visible name.
    await expect(log).toHaveTextContent('Which plan do most new teams pick?')
    await expect(log.querySelectorAll('article')).toHaveLength(2)
    await expect(log.querySelector('[data-slot="reply-name"]')).toBeVisible()
    // The composer holds the app's control, not the sample model picker.
    await expect(canvas.getByRole('button', { name: 'Add a file' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^Model:/ })).toBeNull()
    // The app said a reply is being written, so the composer offers Stop; pressing it tells the app.
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }))
    await expect(args.onStop).toHaveBeenCalledTimes(1)
    await expect(canvas.getByText('You stopped this answer.')).toBeVisible()
    await expect(box).toHaveFocus()
    await expect(canvas.queryByRole('button', { name: 'Stop' })).toBeNull()
    // Sending tells the app once. The page adds nothing of its own: the one new message is the app's, and there is
    // no pretend reply ("Reading signups-sept.csv" is the sample's).
    await userEvent.type(box, 'Make it shorter{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledTimes(1)
    await expect(args.onSubmit).toHaveBeenCalledWith('Make it shorter')
    await expect(within(log).getAllByText('Make it shorter')).toHaveLength(1)
    await expect(log.querySelectorAll('article')).toHaveLength(3)
    await expect(log).not.toHaveTextContent('Reading signups-sept.csv')
    await expect(box).toHaveValue('')
    await expect(await canvas.findByRole('button', { name: 'Stop' })).toBeVisible()
  },
}

const HISTORY_NOW = new Date(2026, 9, 6, 12, 0)
const HISTORY_CHATS: Array<Conversation & { ask: string; reply: string }> = [
  { id: 'q3', title: 'Q3 signups vs target', updatedAt: new Date(2026, 9, 6, 9, 0), ask: 'How did signups do against target?', reply: 'Ahead in July and August, 12% short in September. The quarter closed 4% ahead.' },
  { id: 'launch', title: 'Launch brief draft', updatedAt: new Date(2026, 9, 6, 8, 0), ask: 'Start a brief for the annual-plans launch.', reply: 'Here is a first outline: the problem, who it is for, what changes on the pricing page, and how we will know it worked.' },
  { id: 'pricing', title: 'Pricing page copy ideas', updatedAt: new Date(2026, 9, 5, 16, 0), ask: 'Three headlines for the pricing page.', reply: 'Pay for the team you have. One price, every feature. Start small, grow when you are ready.' },
]

// The built-in chat list is a sample. An app passes its own, here the conversation-history block.
function OwnSidebarPage({ args }: { args: Story['args'] }) {
  const [current, setCurrent] = React.useState('q3')
  const chat = HISTORY_CHATS.find((each) => each.id === current) ?? HISTORY_CHATS[0]
  return (
    <AiChat onSubmit={args?.onSubmit}
      sidebar={<ConversationHistory now={HISTORY_NOW} conversations={HISTORY_CHATS} currentId={current} onSelect={setCurrent} onNew={() => {}} />}>
      <UserMessage>{chat.ask}</UserMessage>
      <AiMessage><p>{chat.reply}</p></AiMessage>
    </AiChat>
  )
}

export const OwnSidebar: Story = {
  ...DESKTOP,
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'The conversation-history block in the left column, in place of the sample list of chats.' } } },
  render: (args) => <OwnSidebarPage args={args} />,
  play: async ({ canvas }) => {
    // One list of chats: the app's. The sample "Chats" list is gone.
    await expect(canvas.queryByRole('navigation', { name: 'Chats' })).toBeNull()
    await expect(canvas.getAllByRole('navigation')).toHaveLength(1)
    const list = canvas.getByRole('navigation', { name: 'Past chats' })
    await expect(list).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Launch brief draft' })).toBeNull()
    // It sits in the same 15rem column, left of the conversation, behind the same divider.
    const region = canvas.getByRole('region', { name: 'Conversation' })
    const column = list.parentElement as HTMLElement
    const page = (region.parentElement as HTMLElement).getBoundingClientRect()
    const side = column.getBoundingClientRect()
    await expect(column.parentElement).toBe(region.parentElement)
    await expect(side.left).toBe(page.left)
    await expect(side.width).toBe(240)
    await expect(side.height).toBe(page.height)
    await expect(region.getBoundingClientRect().left).toBe(side.right)
    await expect(getComputedStyle(column).borderRightWidth).toBe('1px')
    // 8px of padding around the list, less the 1px divider on the right.
    await expect(list.getBoundingClientRect().left).toBe(side.left + 8)
    await expect(list.getBoundingClientRect().right).toBe(side.right - 9)
    // Choosing a chat is the app's to act on: here it opens that conversation.
    await userEvent.click(within(list).getByRole('button', { name: 'Launch brief draft' }))
    await expect(canvas.getByRole('log', { name: 'Messages' })).toHaveTextContent('Start a brief for the annual-plans launch.')
    await expect(within(list).getByRole('button', { name: 'Launch brief draft' })).toHaveAttribute('aria-current', 'true')
  },
}

export const NoSidebar: Story = {
  ...DESKTOP,
  args: { sidebar: null, composerTrailing: null },
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'No left column and nothing in the composer\'s trailing slot: the conversation takes the whole page.' } } },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('navigation')).toBeNull()
    await expect(canvasElement.querySelector('nav')).toBeNull()
    // One column: the conversation starts at the page's left edge and takes its whole width.
    const region = canvas.getByRole('region', { name: 'Conversation' })
    const page = region.parentElement as HTMLElement
    await expect(region.getBoundingClientRect().left).toBe(page.getBoundingClientRect().left)
    await expect(region.getBoundingClientRect().width).toBe(page.getBoundingClientRect().width)
    await expect(page.getBoundingClientRect().width).toBeGreaterThanOrEqual(1024 - 64)
    // The thread keeps its readable column, centred in it.
    const log = canvas.getByRole('log', { name: 'Messages' }).getBoundingClientRect()
    await expect(log.width).toBe(768)
    const around = region.getBoundingClientRect()
    await expect(Math.abs((log.left - around.left) - (around.right - log.right))).toBeLessThanOrEqual(1)
    // No model picker; the sample conversation is untouched (children were not passed).
    await expect(canvas.queryByRole('button', { name: /^Model:/ })).toBeNull()
    await expect(canvas.getByRole('log', { name: 'Messages' })).toHaveTextContent('4% ahead')
    await expect(canvas.getByRole('textbox', { name: 'Message' })).toBeVisible()
  },
}

// `sidebar={cond && <List />}` with cond false: no column, the same as null. And false in the trailing slot is none.
export const SidebarFalseIsNoColumn: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { sidebar: false, composerTrailing: false },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('navigation')).toBeNull()
    await expect(canvasElement.querySelector('[data-slot="chat-sidebar"]')).toBeNull()
    const region = canvas.getByRole('region', { name: 'Conversation' })
    const page = region.parentElement as HTMLElement
    await expect(page.children).toHaveLength(1)
    await expect(region.getBoundingClientRect().width).toBe(page.getBoundingClientRect().width)
    await expect(canvas.queryByRole('button', { name: /^Model:/ })).toBeNull()
  },
}

// An empty string draws nothing, so it is no column and no trailing control, not an empty bordered column.
export const SidebarEmptyStringIsNoColumn: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { sidebar: '', composerTrailing: true },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.queryByRole('navigation')).toBeNull()
    await expect(canvasElement.querySelector('[data-slot="chat-sidebar"]')).toBeNull()
    const region = canvas.getByRole('region', { name: 'Conversation' })
    const page = region.parentElement as HTMLElement
    await expect(page.children).toHaveLength(1)
    await expect(region.getBoundingClientRect().width).toBe(page.getBoundingClientRect().width)
    await expect(canvas.queryByRole('button', { name: /^Model:/ })).toBeNull()
  },
}

// The app owns the composer's text: here it starts with a draft, and clears it once it has been sent.
function ControlledComposerPage({ args }: { args: Story['args'] }) {
  const [draft, setDraft] = React.useState('Summarise this for the board')
  return (
    <AiChat value={draft}
      onValueChange={(next) => { setDraft(next); args?.onValueChange?.(next) }}
      onSubmit={(text) => { setDraft(''); args?.onSubmit?.(text) }}>
      {OWN_TURNS.slice(0, 1).map(ownTurn)}
    </AiChat>
  )
}

export const ControlledComposer: Story = {
  ...DESKTOP,
  args: { onValueChange: fn() },
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'The app holds the composer\'s text (value and onValueChange): it starts with a draft, and the app clears it after sending.' } } },
  render: (args) => <ControlledComposerPage args={args} />,
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await expect(box).toHaveValue('Summarise this for the board')
    await userEvent.type(box, ', briefly')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Summarise this for the board, briefly')
    await expect(box).toHaveValue('Summarise this for the board, briefly')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledTimes(1)
    await expect(args.onSubmit).toHaveBeenCalledWith('Summarise this for the board, briefly')
    // Emptied by the app, in its onSubmit.
    await expect(box).toHaveValue('')
    // With nothing passed for it, the sample model picker is still in the composer.
    await expect(canvas.getByRole('button', { name: /^Model:/ })).toBeVisible()
  },
}

// The other half of "controlled": a value the app does not change stays, whatever is typed or sent.
export const ControlledValueIsTheApps: Story = {
  ...DESKTOP,
  tags: ['!autodocs'],
  args: { value: 'Fixed by the app', onValueChange: fn() },
  play: async ({ canvas, args }) => {
    const box = canvas.getByRole('textbox', { name: 'Message' })
    await userEvent.type(box, '!')
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Fixed by the app!')
    await expect(box).toHaveValue('Fixed by the app')
    await userEvent.click(canvas.getByRole('button', { name: 'Compare with Q2' }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith('Compare with Q2')
    await expect(box).toHaveValue('Fixed by the app')
    await userEvent.keyboard('{Enter}')
    await expect(args.onSubmit).toHaveBeenCalledWith('Fixed by the app')
    await expect(box).toHaveValue('Fixed by the app')
    await expect(args.onValueChange).not.toHaveBeenCalledWith('')
  },
}

// The agent pieces put together in one conversation, so the whole flow (steps, an approval, a question, feedback) can
// be walked through with a keyboard and a screen reader in one place (CRA-282).
const STEPS: AgentStep[] = [
  { label: 'Read signups-sept.csv', status: 'done', meta: '4 s' },
  { label: 'Compared each month with targets', status: 'done', meta: '6 s', detail: 'July +3%, August +5%, September down 12%.' },
  { label: 'Drafted the summary', status: 'done', meta: '9 s' },
]
const OPTIONS: QuestionOption[] = [
  { value: 'leadership', label: 'Leadership', description: '3 people. Shorter version, numbers only.' },
  { value: 'growth', label: 'The growth team', description: '6 people. They own signups and asked for it last month.' },
]
// The cards sit under the reply's text, clear of its avatar, as the sample follow-ups do.
const UNDER_THE_REPLY = 'ml-[2.375rem]'

function AgentPieces({ args }: { args: Story['args'] }) {
  const [sent, setSent] = React.useState<string>()
  const [answered, setAnswered] = React.useState<string>()
  const [feedback, setFeedback] = React.useState<AiFeedback>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  return (
    <AiChat sidebar={null} onSubmit={args?.onSubmit}>
      <UserMessage>Send the September signups report to the growth team.</UserMessage>
      <AiMessage>
        <p>Here is what I did to put the report together.</p>
        <AgentSteps title="Preparing the September report" steps={STEPS} />
      </AiMessage>
      <ApprovalCard className={UNDER_THE_REPLY} title="The agent wants to send this email"
        details={[{ label: 'To', value: 'growth@example.com' }, { label: 'Subject', value: 'September signups: 12% under target' }]}
        defaultBody="Hi team, September came in 12% under target, though the quarter still closed 4% ahead. Chart attached."
        bodyLabel="Email body" actionLabel="Send email" actionIcon={<Icon name="mail" />}
        onApprove={() => setSent('Sent to 6 people.')} denyLabel="Don't send" onDeny={() => setSent('Not sent.')}
        consequence="Goes to 6 people. Nothing is sent until you choose." outcome={sent} />
      <QuestionCard className={UNDER_THE_REPLY} question="Who should get next month's report?" options={OPTIONS} recommended="growth"
        onContinue={(answer) => setAnswered(answer.value === 'growth' ? 'The growth team will get it.' : 'Leadership will get it.')}
        onSkip={() => setAnswered('Skipped.')} outcome={answered} />
      <AiMessage feedback={feedback} onFeedback={(value) => { setFeedback(value); setFormOpen(value === 'down') }}
        feedbackForm={formOpen ? <AiFeedbackForm onSubmit={() => {}} onClose={() => setFormOpen(false)} /> : undefined}>
        <p>Done. The report went to the growth team, and the same list is set for next month.</p>
      </AiMessage>
    </AiChat>
  )
}

export const AgentPiecesInOneThread: Story = {
  ...DESKTOP,
  parameters: { ...DESKTOP.parameters, docs: { description: { story: 'The agent pieces as turns of one conversation: steps inside a reply, an approval, a question, and feedback on the last reply.' } } },
  render: (args) => <AgentPieces args={args} />,
  play: async ({ canvas }) => {
    const log = canvas.getByRole('log', { name: 'Messages' })
    // Every piece is in the one log, in the order a conversation has them.
    await expect(canvas.getAllByRole('log')).toHaveLength(1)
    const order = ['Preparing the September report', 'The agent wants to send this email', 'The agent has a question'].map((name) => canvas.getByRole('group', { name }))
    for (const piece of order) await expect(log).toContainElement(piece)
    await expect(order[0].compareDocumentPosition(order[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await expect(order[1].compareDocumentPosition(order[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Approving by keyboard removes the button that had focus; the person lands on the outcome line of that card.
    await tabTo(canvas.getByRole('button', { name: 'Send email' }))
    await userEvent.keyboard('{Enter}')
    const outcome = canvas.getByText('Sent to 6 people.').closest('[role="status"]') as HTMLElement
    await waitFor(() => expect(outcome).toHaveFocus())
    await expect(order[1]).toContainElement(outcome)
    // A thumbs-down on the last reply opens the feedback form under it.
    await userEvent.click(canvas.getByRole('button', { name: 'Bad answer' }))
    await expect(await canvas.findByRole('group', { name: 'What was wrong?' })).toBeVisible()
    // The page scrolls and the composer is pinned to its bottom, so the form opened behind the composer. Scrolling to
    // the end, as an app does for a new turn, shows it above the composer.
    window.scrollTo({ top: document.documentElement.scrollHeight })
  },
}
