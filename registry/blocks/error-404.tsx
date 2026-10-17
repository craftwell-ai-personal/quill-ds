import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** A full-page 404 error state with go-back and home recovery actions. */
export function Error404() {
  return (
    <div className="flex h-frame-sm w-full flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <span className="font-heading text-4xl text-muted-foreground">
        404
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="fraunces-text font-heading text-2xl">Page not found</h1>
        <p className="max-w-card text-sm text-pretty text-muted-foreground">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline">
          <Icon name="arrow_back" size={16} /> Go back
        </Button>
        <Button>Take me home</Button>
      </div>
    </div>
  )
}
