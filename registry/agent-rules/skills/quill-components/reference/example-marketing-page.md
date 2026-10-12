# example-marketing-page (pattern)

A whole public marketing page, composed: navbar, hero, feature-section, pricing, testimonial and footer, one idea per section.

### When to use
- You are building a public page that persuades a visitor, such as a product landing page or a pricing page, read top to bottom and left through a call to action.
- You want to start from a page whose section order and 96px section rhythm are already right, and only replace the sample content.

### Reach for instead
- **example-app-page** — when the visitor is signed in and works with records: a sidebar shell, a page title and a table, not sections that sell.
- **example-auth-page** — when the page only signs someone in. The navbar's Sign in leads there; do not build a sign-in form into a marketing section.
- **ai-home** — when the first screen is an AI assistant's start page, with a greeting and a composer, not a page that sells a product.
- **error-404** — when the page is a missing-page state: one message and two ways out, not a page of sections.

### Rules
- **Do:** Give every section one idea: a heading and one composition (the feature grid, the pricing grid, one quote). **Don't:** Stack unrelated widgets in one section, or add a section that repeats the hero's promise in other words.
- **Do:** Wrap a section you add the way pricing and testimonial are wrapped: py-24 (py-14 on mobile), px-12 (px-6 on mobile), inside the 1400px width. **Don't:** Give each section its own padding, or add padding around hero and feature-section, which already carry their own rhythm.
- **Do:** Keep one primary call to action per view (Get started in the navbar and hero, the featured plan in pricing) with quieter ghost or outline buttons beside it. **Don't:** Make every button primary: when everything is the main action, nothing is.

### Accessibility
- Landmarks: the navbar is a navigation, the sections sit in one main, and the footer is the contentinfo with three navigations named Product, Resources and Company. The navbar's navigation has no name; give it aria-label="Main" so it is told apart from the footer's three.
- Heading order: the hero holds the h1, feature-section an h2 with h3 per feature. Pricing and testimonial have no heading of their own; when you add one, make it an h2 so the outline stays h1 → h2 → h3.
- Focus order follows the composition: navbar links, Sign in, Get started, the hero's two actions, the three plan buttons, then the footer links and the legal links. Below the md width the navbar's link list is hidden and nothing replaces it, so add a menu button if those links matter on phones.
- There is no skip link. Add one as the first focusable element, pointing at the main element, so keyboard users can pass the navbar.

### Design tokens
`--background` · `--foreground` · `--muted-foreground` · `--border` · `--card` · `--primary` · `--ring` · `--font-heading` · `--space-24`

