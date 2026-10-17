import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const tasks = [
  { label: 'Create your account', done: true },
  { label: 'Name your workspace', done: true },
  { label: 'Invite your team', done: false },
  { label: 'Connect a repository', done: false },
]

/** A setup checklist card with a progress bar, completed and pending tasks, and start links for remaining steps. */
export function Onboarding() {
  const done = tasks.filter((t) => t.done).length
  return (
    <Card className="w-card">
      <CardHeader>
        <CardTitle>Get set up</CardTitle>
        <CardDescription>
          {done} of {tasks.length} complete — you’re almost there.
        </CardDescription>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--input)_10%,var(--muted))]">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {tasks.map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
            <span
              className={`flex size-5 items-center justify-center rounded-full ${
                t.done ? 'bg-primary text-primary-foreground' : 'border border-input'
              }`}
            >
              {t.done && <Icon name="check" size={13} />}
            </span>
            <span className={`flex-1 text-sm ${t.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {t.label}
            </span>
            {!t.done && (
              <Button variant="link" size="sm">
                Start
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
