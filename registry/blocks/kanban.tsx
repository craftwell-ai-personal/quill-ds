import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'

const columns = [
  { title: 'Backlog', cards: [{ t: 'Audit color contrast', tag: 'a11y' }, { t: 'Draft migration guide', tag: 'docs' }] },
  { title: 'In progress', cards: [{ t: 'Wave B components', tag: 'design' }, { t: 'Icon gallery search', tag: 'feat' }] },
  { title: 'Done', cards: [{ t: 'Token foundation', tag: 'core' }, { t: 'Material Symbols', tag: 'icons' }] },
]

/** A three-column kanban board with card counts, tagged task cards, and an add-card affordance per column. */
export function Kanban() {
  return (
    <div className="flex gap-4 text-foreground">
      {columns.map((col) => (
        <div key={col.title} className="flex w-rail shrink-0 flex-col gap-3 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium">{col.title}</span>
            <Badge variant="secondary">{col.cards.length}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            {col.cards.map((c) => (
              <div key={c.t} className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
                <span className="text-sm">{c.t}</span>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{c.tag}</Badge>
                  <div className="flex size-6 items-center justify-center rounded-full bg-muted text-2xs font-medium text-muted-foreground">
                    AL
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="flex items-center gap-1.5 rounded-lg px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
            <Icon name="add" size={16} /> Add card
          </button>
        </div>
      ))}
    </div>
  )
}
