import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

const links = ['Product', 'Solutions', 'Pricing', 'Docs']

/** A top navigation bar with brand wordmark, a responsive link list, and sign-in / get-started actions. */
export function Navbar() {
  return (
    <nav className="flex h-bar w-full items-center gap-6 border-b border-border bg-background px-6 text-foreground">
      <span className="font-heading text-lg">Quill</span>
      <ul className="hidden flex-1 items-center gap-1 md:flex">
        {links.map((l) => (
          <li key={l}>
            <a
              href="#"
              className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground outline-hidden focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {l}
            </a>
          </li>
        ))}
      </ul>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm">
          Sign in
        </Button>
        <Button size="sm">
          Get started <Icon name="arrow_forward" size={16} />
        </Button>
      </div>
    </nav>
  )
}
