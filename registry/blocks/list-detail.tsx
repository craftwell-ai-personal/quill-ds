import { Icon } from '@/components/ui/icon'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const threads = [
  { from: 'Grace Hopper', subject: 'Re: Q3 roadmap', preview: 'Looks great — one note on timing…', time: '9:41', active: true },
  { from: 'Alan Turing', subject: 'Deploy window', preview: 'Can we push to Thursday?', time: '8:02' },
  { from: 'Katherine J.', subject: 'Design review', preview: 'Left comments on the flows.', time: 'Yesterday' },
]

/** An inbox-style split view — a selectable message list beside a detail pane with archive and delete actions. */
export function ListDetail() {
  return (
    <div className="flex h-frame w-full bg-background text-foreground">
      <div className="flex w-panel shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-medium">Inbox</span>
          <Badge variant="secondary">3</Badge>
        </div>
        <Separator />
        <ul className="flex flex-col overflow-auto">
          {threads.map((t) => (
            <li key={t.subject}>
              <button
                className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent outline-hidden focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 ${
                  t.active ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.from}</span>
                  <span className="text-xs text-muted-foreground">{t.time}</span>
                </div>
                <span className="text-sm text-foreground">{t.subject}</span>
                <span className="truncate text-xs text-muted-foreground">{t.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <span className="text-lg font-medium">Re: Q3 roadmap</span>
            <span className="text-sm text-muted-foreground">Grace Hopper · 9:41 AM</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" aria-label="Archive">
              <Icon name="folder_open" size={18} />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete">
              <Icon name="delete" size={18} />
            </Button>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4 overflow-auto p-6 text-sm leading-relaxed text-foreground">
          <p>Hi Ada,</p>
          <p>
            Looks great — one note on timing: can we align the beta with the marketing push in week 6?
            That gives us room to bake in the feedback from the design review.
          </p>
          <p>Thanks, Grace</p>
        </div>
      </div>
    </div>
  )
}
