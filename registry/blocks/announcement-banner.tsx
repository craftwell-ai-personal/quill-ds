import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** Two dismissible announcement banners — an inline bordered page banner and a full-bleed primary-color variant. */
export function AnnouncementBanner() {
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-4">
      {/* Inline page banner */}
      <div className="flex items-center justify-between gap-4 rounded-lg bg-card px-4 py-3 ring-1 ring-foreground/10 max-sm:flex-col max-sm:items-start">
        <div className="flex items-center gap-3">
          <Badge>New</Badge>
          <p className="text-sm text-foreground">
            Issue 004 of The Brief just shipped — how we scope a design system engagement.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="link" size="sm">
            Read it <Icon name="arrow_forward" size={14} />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Dismiss announcement">
            <Icon name="close" size={16} />
          </Button>
        </div>
      </div>
      {/* Full-bleed ink banner */}
      <div className="flex items-center justify-between gap-4 rounded-lg bg-primary px-4 py-3 text-primary-foreground max-sm:flex-col max-sm:items-start">
        <p className="text-sm">
          <span className="font-medium">Workshop:</span> Design systems for product teams — Saturday,
          July 26. Twelve seats.
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="secondary" size="sm">
            Save a seat
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss workshop banner"
            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Icon name="close" size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
