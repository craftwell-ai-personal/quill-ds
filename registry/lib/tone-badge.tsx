import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * ToneBadge — the Quill uppercase tag pill. One component for every
 * status/tier/label chip so tone and size never drift per call site:
 *
 * - `tone`: the Quill pigment vocabulary (moss = positive/current,
 *   gold = caution/developing, terracotta = attention/danger,
 *   indigo = informational/dormant, neutral/muted = quiet).
 * - `size`: `md` (the 20px badge) or `sm` (16px — the count-pill scale).
 * - `solid`: filled pigment for the strong cue (e.g. a "current" marker);
 *   default is the tinted chip (pigment wash + deep text, AA-checked).
 *
 * Hand-rolling `rounded-full … uppercase` spans is how one-off pills drift
 * off the system — use this instead.
 */

export type Tone = 'moss' | 'gold' | 'terracotta' | 'indigo' | 'neutral' | 'muted'

const TINT: Record<Tone, string> = {
  moss: 'bg-moss/20 text-moss-deep',
  // gold-text (the darker text-safe gold), not gold-deep: gold-deep on the
  // tint fails AA in light themes.
  gold: 'bg-gold/25 text-gold-text',
  terracotta: 'bg-terracotta/16 text-terracotta-deep',
  indigo: 'bg-indigo/30 text-indigo-deep',
  neutral: 'bg-paper-deep text-ink-soft',
  muted: 'bg-paper-deep text-ink-muted',
}

const SOLID: Record<Tone, string> = {
  moss: 'bg-moss-deep text-paper',
  // gold-text, not gold-deep: paper on gold-deep is 3.3:1 — under AA.
  gold: 'bg-gold-text text-paper',
  terracotta: 'bg-terracotta-deep text-paper',
  indigo: 'bg-indigo-deep text-paper',
  neutral: 'bg-ink text-paper',
  muted: 'bg-ink-muted text-paper',
}

/** Quill's uppercase tag pill for status, tiers, and labels — wraps Badge with the pigment vocabulary (moss/gold/terracotta/indigo/neutral/muted) baked in so tone never drifts per call site. */
export function ToneBadge({
  tone,
  size = 'md',
  solid = false,
  title,
  className,
  children,
}: {
  tone: Tone
  size?: 'md' | 'sm'
  solid?: boolean
  title?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <Badge
      title={title}
      className={cn(
        'border-transparent text-2xs font-medium tracking-label uppercase',
        size === 'sm' ? 'h-4 px-1.5' : '',
        solid ? SOLID[tone] : TINT[tone],
        className
      )}
    >
      {children}
    </Badge>
  )
}
