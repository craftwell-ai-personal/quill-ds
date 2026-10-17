import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'

const events = [
  {
    who: 'AL',
    name: 'Ada Lovelace',
    action: 'published',
    what: 'The Brief · 004',
    when: '2 hours ago',
    icon: 'ink_pen',
  },
  {
    who: 'JD',
    name: 'John Doe',
    action: 'commented on',
    what: 'Discovery findings',
    when: 'Yesterday',
    icon: 'chat_bubble',
  },
  {
    who: 'MM',
    name: 'Meeting Mapper',
    action: 'archived',
    what: 'Q2 planning notes',
    when: '2 days ago',
    icon: 'archive',
  },
  {
    who: 'AL',
    name: 'Ada Lovelace',
    action: 'invited',
    what: 'two new collaborators',
    when: 'Last week',
    icon: 'person_add',
  },
] as const

/** A card timeline of recent events — avatar, action text, and a relative timestamp per entry. */
export function ActivityFeed() {
  return (
    <Card className="w-card-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Activity</CardTitle>
          <Badge variant="ghost">This week</Badge>
        </div>
        <CardDescription>What happened while you were away.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative flex flex-col gap-5 before:absolute before:top-2 before:bottom-2 before:left-4 before:w-px before:bg-border">
          {events.map((e, i) => (
            <li key={i} className="relative flex items-start gap-3">
              <Avatar className="relative z-1 ring-4 ring-card">
                <AvatarFallback>{e.who}</AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                <p className="text-sm leading-snug">
                  <span className="font-medium text-foreground">{e.name}</span>{' '}
                  <span className="text-muted-foreground">{e.action}</span>{' '}
                  <span className="font-medium text-foreground">{e.what}</span>
                </p>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Icon name={e.icon as never} size={12} aria-hidden /> {e.when}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
