import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const steps = ['Account', 'Workspace', 'Invite']

/** A multi-step setup card — a progress stepper, workspace fields, and back/continue navigation. */
export function Wizard() {
  return (
    <Card className="w-card-lg">
      <CardHeader>
        <ol className="flex items-center gap-2">
          {steps.map((s, i) => {
            const state = i === 0 ? 'done' : i === 1 ? 'current' : 'todo'
            return (
              // only steps followed by a connector stretch: the last ends flush with the header's right edge instead of leaving a gap
              <li key={s} className={`flex items-center gap-2 ${i < steps.length - 1 ? 'flex-1' : ''}`}>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    state === 'done'
                      ? 'bg-primary text-primary-foreground'
                      : state === 'current'
                        ? 'bg-primary/10 text-primary ring-1 ring-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {state === 'done' ? <Icon name="check" size={14} /> : i + 1}
                </span>
                <span className={`text-sm ${state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {s}
                </span>
                {i < steps.length - 1 && <span className="h-px flex-1 bg-border" />}
              </li>
            )
          })}
        </ol>
        <CardTitle className="pt-2">Name your workspace</CardTitle>
        <CardDescription>This is where your team’s projects will live.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="w-name">Workspace name</Label>
          <Input id="w-name" placeholder="Acme Inc." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="w-url">Workspace URL</Label>
          <Input id="w-url" placeholder="acme" />
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="ghost">Back</Button>
        <Button>
          Continue <Icon name="arrow_forward" size={16} />
        </Button>
      </CardFooter>
    </Card>
  )
}
