import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const team = [
  { initials: 'JD', name: 'John Doe', role: 'Founder & Principal', badge: 'Strategy' },
  { initials: 'AL', name: 'Ada Lovelace', role: 'Engineering', badge: 'Systems' },
  { initials: 'NO', name: 'Nadia Okonjo', role: 'Product Design', badge: 'Design' },
  { initials: 'MR', name: 'Marcus Reed', role: 'Research', badge: 'Research' },
]

/** A marketing team grid with avatar cards showing each member's name, role, specialty badge, and email action. */
export function TeamSection() {
  return (
    <section className="mx-auto flex w-full max-w-page flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-xs font-medium tracking-eyebrow uppercase text-ink-muted">The team</span>
        <h2 className="font-heading text-2xl text-foreground">Curated collections, crafted by intelligence</h2>
        <p className="max-w-card-lg text-sm leading-relaxed text-muted-foreground">
          A small team who believe interfaces should feel like well-kept notebooks.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {team.map((m) => (
          <Card key={m.name} size="sm">
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <Avatar size="lg">
                <AvatarFallback>{m.initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-foreground">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.role}</span>
                <Badge variant="secondary">{m.badge}</Badge>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={`Email ${m.name}`}>
                <Icon name="mail" size={16} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
