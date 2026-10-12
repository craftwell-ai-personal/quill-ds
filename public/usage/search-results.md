# search-results (pattern)

A docs search panel — query input, result count, and a linked result list with breadcrumbs and type badges.

### When to use
- You need a search panel with a query input, result count, and a linked result list.

### Reach for instead
- **command-palette** — when search is a global, keyboard-triggered overlay (⌘K) rather than an inline panel on the page.
- **data-table** — when results are structured records with multiple sortable columns, not a simple linked list.

### Rules
- **Do:** State the result count in visible text (2 results for “token”) so users know the query actually ran. **Don't:** Leave users guessing whether zero results means the search hasn't run yet or genuinely found nothing.

### Accessibility
- The search input has an explicit aria-label ("Search") since its visible placeholder text is not a substitute for a label.
- Each result is a single focusable `<a>` wrapping its full content (title, breadcrumb, badge) — not a div with a separate, hard-to-target link inside.

### Design tokens
`--border` · `--muted` · `--accent`

