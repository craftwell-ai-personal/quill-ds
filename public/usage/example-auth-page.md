# example-auth-page (pattern)

A whole sign-in page, composed: login-split-panel alone on the page, with nothing competing with the one task.

### When to use
- You need the page people land on to sign in, standing on its own: no navbar, no footer, no promo strip.
- You want to start from a page that already gives the sign-in the whole screen, and only replace the brand quote and copy.

### Reach for instead
- **example-app-page** — when the person is already signed in and the page shows their records inside the app shell.
- **example-marketing-page** — when the page sells the product to a visitor. It links to this page through Sign in rather than holding a form.
- **login** — when the sign-in is a card inside a page that already has its own shell, not a page of its own.
- **login-minimal** — when you have no brand quote worth the space and want a bare sign-in by one-time code.
- **signup** — when the person is creating an account, not signing in to one.

### Rules
- **Do:** Leave the sign-in alone on the page; the only other actions are the form's own: Forgot? and the magic link. **Don't:** Add a navbar, a footer or a promo strip around it: every other link is a way to abandon signing in.
- **Do:** Replace the brand panel's quote and wordmark with your own, and keep the form column as it is. **Don't:** Move product claims or extra fields into the form column; the panel is the only place for brand story, and it hides on phones.

### Accessibility
- Landmarks: the page has no main landmark. Wrap the form column in a main element in your app. The quote's attribution is a footer inside the blockquote, which Chrome reports as a page footer (contentinfo); make it a figcaption or a p if you keep the quote.
- Heading order: "Welcome back" is the only heading, the h1. The brand panel has no heading, which is right for decorative copy.
- Focus order: email, Forgot?, password, Sign in, then Continue with a magic link. Forgot? sits between the two fields because it shares the password label's row; if that trips people up, move it below the password field.
- There is no skip link and none is needed: the email field is the first focusable element. At phone width the brand panel is hidden, and with it the quote, so nothing a screen reader needs is lost.

### Design tokens
`--primary` · `--primary-foreground` · `--background` · `--foreground` · `--muted-foreground` · `--input` · `--ring` · `--border` · `--font-heading`

