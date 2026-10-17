import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Icon } from '@/components/ui/icon'

const messages = [
  {
    from: 'Ada Lovelace',
    initials: 'AL',
    subject: 'Scope for the Q3 engagement',
    preview: 'Revised deliverables are in the shared folder — see the summary…',
    time: '9:12',
    unread: true,
    tag: 'Client',
  },
  {
    from: 'Nadia Okonjo',
    initials: 'NO',
    subject: 'Component API revisions',
    preview: 'I reworked the variant props so they compose cleanly at three scales…',
    time: 'Yesterday',
    unread: true,
    tag: 'Design',
  },
  {
    from: 'Marcus Reed',
    initials: 'MR',
    subject: 'Discovery findings, second pass',
    preview: 'Interview notes are synthesised — summary tomorrow morning…',
    time: 'Tue',
    unread: false,
    tag: 'Research',
  },
] as const

/** A two-pane mail client shell — a searchable message list and a reading pane with toolbar and inline reply. */
export function MailShell() {
  return (
    <div className="grid h-frame w-full grid-cols-[var(--size-card-sm)_minmax(0,1fr)] bg-background max-lg:grid-cols-1">
      {/* Message list */}
      <div className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h2 className="font-heading text-base font-medium text-foreground">Inbox</h2>
          <Badge variant="secondary">2 unread</Badge>
        </div>
        <div className="px-4 pb-3">
          <Label htmlFor="mail-search" className="sr-only">
            Search mail
          </Label>
          <Input id="mail-search" placeholder="Search mail…" />
        </div>
        <Separator />
        <ul className="min-h-0 flex-1 overflow-auto" aria-label="Messages">
          {messages.map((m) => (
            <li key={m.subject}>
              <button
                type="button"
                // Each row fills the scrolling list, which would cut off an outline drawn outside it. The theme's forced-colours rule (Windows High Contrast) draws it inside elements marked this way.
                data-focus-inset=""
                className="flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=true]:bg-muted"
                aria-current={m.subject === messages[0].subject}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-sm ${m.unread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                    {m.from}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{m.time}</span>
                </div>
                <span className="text-sm font-medium text-foreground">{m.subject}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{m.preview}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Reading pane */}
      <div className="flex min-h-0 flex-col max-lg:hidden">
        <div className="flex items-center gap-1 border-b border-border px-4 py-2">
          <Button variant="ghost" size="icon-sm" aria-label="Archive">
            <Icon name="archive" size={18} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Icon name="delete" size={18} />
          </Button>
          <Separator orientation="vertical" className="mx-1 h-4 data-vertical:self-center" />
          <Button variant="ghost" size="icon-sm" aria-label="Reply">
            <Icon name="reply" size={18} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Forward">
            <Icon name="forward" size={18} />
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">1 of 24</span>
        </div>
        <div className="flex items-start gap-3 px-6 py-4">
          <Avatar>
            <AvatarFallback>AL</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Ada Lovelace</span>
            <span className="text-xs text-muted-foreground">to Client · 9:12</span>
          </div>
          <Badge variant="outline" className="ml-auto">
            Client
          </Badge>
        </div>
        <Separator />
        <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
          <h3 className="font-heading text-lg text-foreground">Scope for the Q3 engagement</h3>
          <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Revised deliverables are in the shared folder — the component inventory held up
              even at the smallest breakpoint, and the dark variants read exactly as we hoped.
            </p>
            <p>
              I&rsquo;ve queued the remaining two flows for tomorrow. If review lands on time we
              should have the full set ready by Thursday.
            </p>
            <p>— A.</p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center gap-2 px-6 py-3">
          <Label htmlFor="mail-reply" className="sr-only">
            Reply
          </Label>
          <Input id="mail-reply" placeholder="Reply to Ada…" className="flex-1" />
          {/* Default size, so Send matches the 32px field beside it. */}
          <Button>
            Send <Icon name="send" size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
