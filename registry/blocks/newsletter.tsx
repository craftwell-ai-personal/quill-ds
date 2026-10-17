'use client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** A centered newsletter-signup section — an email field, subscribe action, and social proof. */
export function Newsletter() {
  return (
    <section className="flex w-card-xl flex-col items-center gap-4 rounded-xl bg-card p-10 text-center ring-1 ring-foreground/10">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon name="mail" size={20} aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl text-foreground">The Brief</h2>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          One letter a month on design systems and the teams that ship them. No spam, no noise —
          unsubscribe any time.
        </p>
      </div>
      <form className="flex w-full max-w-card items-start gap-2" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-1 flex-col gap-1 text-left">
          <Label htmlFor="newsletter-email" className="sr-only">
            Email address
          </Label>
          <Input id="newsletter-email" type="email" placeholder="you@example.com" />
        </div>
        <Button type="submit">Subscribe</Button>
      </form>
      <p className="text-xs text-muted-foreground">Joined by 4,200 fellow practitioners.</p>
    </section>
  )
}
