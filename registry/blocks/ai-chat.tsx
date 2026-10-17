'use client'

import * as React from 'react'
import { PromptComposer } from '@/components/ui/prompt-composer'
import { AiMessage, UserMessage } from '@/components/ui/ai-message'
import { AiThinking } from '@/components/ui/ai-thinking'
import { Citation, Sources, type Source } from '@/components/ui/citations'
import { SuggestedPrompts } from '@/components/ui/suggested-prompts'
import { AUTO_MODEL, ModelPicker, type ModelOption } from '@/components/ui/model-picker'
import { AiNotice } from '@/components/ui/ai-notice'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const SOURCES: Source[] = [
  { title: 'Q3 board deck.pdf', label: 'Q3 deck', detail: 'Page 4 · Quarterly targets', snippet: 'July 4,100 · August 4,300 · September 4,800 signups.', kind: 'file' },
  { title: 'signups-sept.csv', label: 'signups-sept', detail: '812 rows', snippet: '4,226 signups, 12% under target.', kind: 'file' },
]
const MODELS: ModelOption[] = [
  { value: 'quick', label: 'Quick', description: 'Fast answers, fewer credits' },
  { value: 'balanced', label: 'Balanced', description: 'Good for most work' },
  { value: 'deep', label: 'Deep', description: 'Thinks longer on hard problems' },
]
const CHATS = { Today: ['Q3 signups vs target', 'Launch brief draft'], Yesterday: ['Pricing page copy ideas'] }

// React draws nothing for these, so a slot holding one is empty: `text && <List />` with an empty string.
const drawsNothing = (node: React.ReactNode) => node === undefined || node === null || typeof node === 'boolean' || node === ''

type Turn = { id: number; ask: string; reply: 'working' | 'stopped' }

export type AiChatProps = {
  onSubmit?: (value: string) => void
  /** Your own conversation: UserMessage, AiMessage and cards. Passing anything but undefined replaces the sample turns and follow-ups: sending adds nothing by itself (add the turn in onSubmit). null, false and an empty list count as passed: they are your thread with nothing in it yet, so only undefined shows the sample. The page does not scroll to a new turn: the page itself scrolls, so that is yours to do. */
  children?: React.ReactNode
  /** With your own conversation: 'working' while a reply is being written, which shows Stop. Not read while the sample is shown. */
  status?: 'idle' | 'working'
  /** With your own conversation: called when Stop is pressed. The cursor goes back to the message box either way. */
  onStop?: () => void
  /** The message box's text. Pass a string to control it (and clear it yourself after onSubmit); leave it out and the page keeps its own. */
  value?: string
  onValueChange?: (value: string) => void
  /** Your list of past chats for the left column, in place of the sample one: the conversation-history block, for example. undefined is the sample list; anything else React draws nothing for (null, true, false, an empty string) is no column at all, so `cond && <List />` gives no column while cond is false. */
  sidebar?: React.ReactNode
  /** What sits in the composer's trailing slot, in place of the sample model picker. undefined is the sample picker; anything else React draws nothing for (null, true, false, an empty string) shows nothing there. */
  composerTrailing?: React.ReactNode
}

/** A full AI conversation page — past chats on the left, the thread in a readable column with reasoning, source chips and follow-ups, and the composer with the model picker and AI notice pinned to the bottom. */
export function AiChat({ onSubmit = () => {}, children, status = 'idle', onStop, value: givenValue, onValueChange, sidebar, composerTrailing }: AiChatProps) {
  const [ownValue, setOwnValue] = React.useState('')
  const value = givenValue === undefined ? ownValue : givenValue
  const setValue = (next: string) => {
    if (givenValue === undefined) setOwnValue(next)
    onValueChange?.(next)
  }
  const [model, setModel] = React.useState(AUTO_MODEL.value)
  const [turns, setTurns] = React.useState<Turn[]>([])
  const composerRef = React.useRef<HTMLTextAreaElement>(null)
  // The app's own conversation, or (left out) the sample one, which this page keeps going with pretend replies.
  const ownsThread = children !== undefined
  const working = ownsThread ? status === 'working' : turns.at(-1)?.reply === 'working'
  const noSidebar = sidebar !== undefined && drawsNothing(sidebar)
  const noTrailing = composerTrailing !== undefined && drawsNothing(composerTrailing)

  return (
    <div className={noSidebar ? 'grid min-h-frame-lg bg-background' : 'grid min-h-frame-lg bg-background md:grid-cols-[var(--size-rail)_minmax(0,1fr)]'}>
      {sidebar === undefined ? (
        <nav aria-label="Chats" className="hidden content-start gap-0.5 border-r border-border p-2 md:grid">
          <Button type="button" variant="outline" size="sm" className="mb-2 justify-start"><Icon name="add" />New chat</Button>
          {Object.entries(CHATS).map(([day, titles]) => (
            <React.Fragment key={day}>
              <p className="px-2.5 pt-2.5 pb-1 text-xs font-semibold text-muted-foreground">{day}</p>
              {titles.map((title, index) => (
                <a key={title} href="#" aria-current={day === 'Today' && index === 0 ? 'page' : undefined}
                  className="truncate rounded-md px-2.5 py-1.5 text-sm text-foreground no-underline hover:bg-muted aria-[current=page]:bg-muted outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">{title}</a>
              ))}
            </React.Fragment>
          ))}
        </nav>
      ) : noSidebar ? null : (
        // The same column, divider and padding as the sample list; what is in it names itself (the conversation-history block is a navigation landmark).
        <div data-slot="chat-sidebar" className="hidden min-w-0 border-r border-border p-2 md:block">{sidebar}</div>
      )}
      <section aria-label="Conversation" className="grid grid-rows-[minmax(0,1fr)_auto]">
        {/* A log is a polite live region, so each new turn is read out. It sits inside the "Conversation" region, which also holds the composer, so the region stays the page landmark. */}
        <div role="log" aria-label="Messages" className="mx-auto grid w-full max-w-thread content-start gap-5 px-4 py-6">
          {ownsThread ? children : (
            <>
              <UserMessage>How did signups do against target this quarter?</UserMessage>
              <AiMessage
                thinking={<AiThinking status="done" seconds={8} steps={['Loaded signups-sept.csv, 812 rows', 'Compared each month with the targets in Q3 board deck.pdf']} />}
                sources={<Sources sources={SOURCES} />}
                onRetry={() => {}}
                onFeedback={() => {}}
              >
                <p>Signups beat target in July and August<Citation source={SOURCES[0]} /> but fell 12% short in September<Citation source={SOURCES[1]} />, so the quarter still closed 4% ahead.</p>
              </AiMessage>
              {turns.length === 0 ? (
                <SuggestedPrompts className="pl-10" label="Follow-ups"
                  suggestions={[{ label: 'Break September down by week' }, { label: 'Compare with Q2' }, { label: 'Draft a note to the team' }]}
                  onPick={(prompt) => { setValue(prompt); composerRef.current?.focus() }} />
              ) : null}
              {turns.map((turn) => (
                <React.Fragment key={turn.id}>
                  <UserMessage>{turn.ask}</UserMessage>
                  {turn.reply === 'working'
                    ? <AiMessage streaming thinking={<AiThinking status="working" activity="Reading signups-sept.csv" />} />
                    : <AiMessage stopped />}
                </React.Fragment>
              ))}
            </>
          )}
        </div>
        <div className="sticky bottom-0 mx-auto grid w-full max-w-thread gap-1.5 bg-background px-4 pt-2 pb-3">
          <PromptComposer
            ref={composerRef}
            size="sm"
            value={value}
            onValueChange={setValue}
            status={working ? 'working' : 'idle'}
            onStop={() => {
              if (ownsThread) onStop?.()
              else setTurns((all) => all.map((turn, index) => (index === all.length - 1 ? { ...turn, reply: 'stopped' } : turn)))
              // Stop unmounts as the composer goes idle; without this keyboard focus falls to the page.
              composerRef.current?.focus()
            }}
            onSubmit={(text) => {
              onSubmit(text)
              if (!ownsThread) setTurns((all) => [...all, { id: all.length + 1, ask: text, reply: 'working' }])
              // A value the app controls is the app's to clear.
              if (givenValue === undefined) setOwnValue('')
            }}
            trailing={composerTrailing === undefined ? <ModelPicker models={MODELS} value={model} onValueChange={setModel} /> : noTrailing ? undefined : composerTrailing}
            placeholder="Ask a follow-up"
          />
          <AiNotice />
        </div>
      </section>
    </div>
  )
}
