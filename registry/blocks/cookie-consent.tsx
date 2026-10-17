import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** A cookie consent banner offering accept, reject, and preferences actions. */
export function CookieConsent() {
  return (
    <div className="flex w-card-xl items-start gap-3 rounded-xl bg-card p-4 text-foreground shadow-md ring-1 ring-foreground/10">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon name="info" size={18} />
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to make Quill work, and optional analytics to improve it. You can
          change your choice anytime.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Accept all</Button>
          <Button size="sm" variant="outline">
            Reject non-essential
          </Button>
          <Button size="sm" variant="ghost">
            Preferences
          </Button>
        </div>
      </div>
    </div>
  )
}
