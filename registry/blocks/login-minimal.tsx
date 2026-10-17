'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** The bare-minimum sign-in — no card chrome, a single email field, sign-in by one-time code. */
export function Minimal() {
  return (
    <form className="flex w-card-sm flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
          Q
        </span>
        <h1 className="fraunces-text font-heading text-lg text-foreground">Sign in to Quill</h1>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="min-email">Email</Label>
        <Input id="min-email" type="email" placeholder="you@example.com" />
      </div>
      <Button className="w-full">
        Continue <Icon name="arrow_forward" size={14} />
      </Button>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        We&rsquo;ll email you a one-time code. No password needed.
      </p>
    </form>
  )
}
