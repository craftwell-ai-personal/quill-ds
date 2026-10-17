import { Separator } from '@/components/ui/separator'

const columns = [
  { title: 'Product', links: ['Overview', 'Components', 'Tokens', 'Changelog'] },
  { title: 'Resources', links: ['Docs', 'Guides', 'Design kit', 'Support'] },
  { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
]

/** A marketing footer with brand blurb, link columns, and legal links. */
export function Footer() {
  return (
    <footer className="w-full bg-background px-6 py-12 text-foreground">
      <div className="flex flex-col gap-10 md:flex-row md:justify-between">
        <div className="flex max-w-card-sm flex-col gap-2">
          <span className="font-heading text-xl">Quill</span>
          <p className="text-sm text-pretty text-muted-foreground">
            A calm, editorial design system for building by hand.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{col.title}</span>
              {col.links.map((l) => (
                <a key={l} href="#" className="rounded-sm text-sm text-muted-foreground hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">
                  {l}
                </a>
              ))}
            </nav>
          ))}
        </div>
      </div>
      <Separator className="my-8" />
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <span>© 2026 Quill. All rights reserved.</span>
        <div className="flex gap-4">
          <a href="#" className="rounded-sm text-muted-foreground hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">Privacy</a>
          <a href="#" className="rounded-sm text-muted-foreground hover:text-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50">Terms</a>
        </div>
      </div>
    </footer>
  )
}
