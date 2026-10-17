import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { Separator } from '@/components/ui/separator'

const results = [
  { title: 'Design tokens', crumb: 'Docs › Foundations', type: 'Guide' },
  { title: 'Button component', crumb: 'Components › Button', type: 'Component' },
  { title: 'Theming & dark mode', crumb: 'Docs › Theming', type: 'Guide' },
  { title: 'Accessibility checklist', crumb: 'Docs › A11y', type: 'Guide' },
]

/** A docs search panel — query input, result count, and a linked result list with breadcrumbs and type badges. */
export function SearchResults() {
  return (
    <div className="flex w-card-lg flex-col gap-3 text-foreground">
      <Input placeholder="Search the docs…" defaultValue="token" aria-label="Search" />
      <p className="text-xs text-muted-foreground">{results.length} results for “token”</p>
      <ul className="overflow-hidden rounded-lg border border-border">
        {results.map((r, i) => (
          <li key={r.title}>
            {i > 0 && <Separator />}
            <a
              href="#"
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent outline-hidden focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon name="description" size={18} />
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">{r.crumb}</span>
              </div>
              <Badge variant="outline">{r.type}</Badge>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
