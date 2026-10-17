'use client'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Provider-first sign-in — the shape you need when identity comes from Google,
 * GitHub or Apple rather than a password you store. The provider buttons are
 * the primary path; the email field below the rule is the fallback, not the
 * headline (delete it for provider-only apps).
 *
 * The marks are inlined rather than pulled from the icon set: brand logos are
 * trademarked artwork on their own grids, not UI glyphs, and each provider's
 * brand guidelines expect its own colour. Google keeps its four-colour mark;
 * GitHub and Apple are monochrome by their own guidelines and take
 * currentColor so they invert correctly in Dusk.
 */

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden focusable="false">
      {/* quill-check: allow raw-color — Google "G" mark, blue — fixed by Google's brand guidelines */}
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      {/* quill-check: allow raw-color — Google "G" mark, green — fixed by Google's brand guidelines */}
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      {/* quill-check: allow raw-color — Google "G" mark, yellow — fixed by Google's brand guidelines */}
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      {/* quill-check: allow raw-color — Google "G" mark, red — fixed by Google's brand guidelines */}
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  )
}

function AppleMark() {
  return (
    // viewBox cropped to the glyph's own bounds (centred): in a 0 0 24 24 box it drew 12px tall beside a 16px Google and GitHub mark.
    <svg viewBox="2.17 2.4 18.51 18.51" width="16" height="16" fill="currentColor" aria-hidden focusable="false">
      <path d="M16.4 12.8c0-2.4 2-3.6 2-3.6-1.1-1.6-2.8-1.8-3.4-1.9-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.2 1.1 0 1.6-.7 3-.7s1.8.7 3 .7c1.2 0 2-1.1 2.8-2.2.9-1.2 1.2-2.4 1.2-2.5 0 0-2.4-.9-2.4-3.4ZM14.2 5.3c.6-.8 1-1.8.9-2.9-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.8-.9 2.8 1 .1 2-.5 2.6-1.3Z" />
    </svg>
  )
}

/** Provider-first sign-in — Google, GitHub, and Apple buttons above an email fallback. */
export function LoginOauth() {
  return (
    <div className="flex w-card-sm flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground">
          Q
        </span>
        <h1 className="fraunces-text font-heading text-lg text-foreground">Sign in to Quill</h1>
        <p className="text-sm text-muted-foreground">
          Use the account you already have.
        </p>
      </div>

      {/* One grid the three buttons share (space · logo · label · space): the label column is as wide as the
          longest label, so the centred logos line up in one column with no fixed width. */}
      <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-y-2">
        <Button variant="outline" className="col-span-full grid grid-cols-subgrid gap-x-2 [&>svg]:col-start-2">
          <GoogleMark /> <span className="col-start-3 text-left">Continue with Google</span>
        </Button>
        <Button variant="outline" className="col-span-full grid grid-cols-subgrid gap-x-2 [&>svg]:col-start-2">
          <GitHubMark /> <span className="col-start-3 text-left">Continue with GitHub</span>
        </Button>
        <Button variant="outline" className="col-span-full grid grid-cols-subgrid gap-x-2 [&>svg]:col-start-2">
          <AppleMark /> <span className="col-start-3 text-left">Continue with Apple</span>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="oauth-email">Email</Label>
          <Input id="oauth-email" type="email" placeholder="you@example.com" />
        </div>
        <Button className="w-full">Continue with email</Button>
      </form>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        By continuing you agree to the Terms and Privacy Policy.
      </p>
    </div>
  )
}
