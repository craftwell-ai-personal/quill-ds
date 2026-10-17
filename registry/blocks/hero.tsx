import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'

/** A centered marketing hero — a release badge, serif headline, supporting copy, and primary/secondary calls to action. */
export function Hero() {
  return (
    <section className="flex w-full flex-col items-center gap-6 bg-background px-6 py-20 text-center">
      <Badge variant="secondary">New — v2.0 is here</Badge>
      <h1 className="max-w-measure font-heading text-5xl leading-display text-balance">
        The calm design system for building things by hand
      </h1>
      <p className="max-w-card-xl text-base text-pretty text-muted-foreground">
        Accessible, themeable components and a single-source token foundation that flows to code
        and design files alike.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg">
          Get started <Icon name="arrow_forward" size={18} />
        </Button>
        <Button size="lg" variant="outline">
          <Icon name="menu_book" size={18} /> Read the docs
        </Button>
      </div>
    </section>
  )
}
