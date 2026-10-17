'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon } from '@/components/ui/icon'

export const quillThemes = [
  { value: 'light', label: 'Dawn', icon: 'light_mode' },
  { value: 'dark', label: 'Dusk', icon: 'dark_mode' },
  { value: 'classic-light', label: 'Classic Light', icon: 'radio_button_unchecked' },
  { value: 'classic-dark', label: 'Classic Dark', icon: 'disk' },
  // star_shine is Material's sparkle (the glyph older releases called
  // auto_awesome) — the AI cue for the cockpit theme. Pulled into the sync
  // core map automatically: coreNames() in build-icons.mjs greps `icon: '…'`
  // across src AND registry, so a block's icons always ship to consumers.
  { value: 'intelligent', label: 'Intelligent', icon: 'star_shine' },
] as const

// Swatch classes are static strings so Tailwind can see them.
export const quillAccents = [
  { value: 'moss', label: 'Moss', swatch: 'bg-moss' },
  { value: 'terracotta', label: 'Terracotta', swatch: 'bg-terracotta' },
  { value: 'indigo', label: 'Indigo', swatch: 'bg-indigo' },
  { value: 'gold', label: 'Gold', swatch: 'bg-gold' },
] as const

export type ThemeValue = (typeof quillThemes)[number]['value']
export type AccentValue = (typeof quillAccents)[number]['value']

const isTheme = (v: unknown): v is ThemeValue =>
  quillThemes.some((t) => t.value === v)
const isAccent = (v: unknown): v is AccentValue =>
  quillAccents.some((a) => a.value === v)

// Filled disk for Classic Dark — the Quill icon set is outlined-only, so the
// filled Material Symbols `circle` ships inline (weight 500, to match the ring).
function DiskGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M480.03-74.02q-83.46 0-157.54-31.88-74.07-31.88-129.39-87.2-55.32-55.32-87.2-129.36-31.88-74.04-31.88-157.51 0-84.46 31.88-158.54 31.88-74.07 87.16-128.9 55.28-54.84 129.34-86.82 74.06-31.99 157.55-31.99 84.48 0 158.59 31.97 74.1 31.97 128.91 86.77 54.82 54.8 86.79 128.88 31.98 74.08 31.98 158.6 0 83.5-31.99 157.57-31.98 74.07-86.82 129.36-54.83 55.29-128.87 87.17-74.04 31.88-158.51 31.88Z" />
    </svg>
  )
}

function ThemeGlyph({ icon, size = 16 }: { icon: (typeof quillThemes)[number]['icon']; size?: number }) {
  if (icon === 'disk') return <DiskGlyph size={size} />
  return <Icon name={icon} size={size} />
}

/** A dropdown picker for the five Quill themes and four pigment accents — sets data-theme/data-accent and persists both to localStorage. */
export function ThemeSelector({
  value,
  onValueChange,
  accent,
  onAccentChange,
  storageKey = 'quill-theme',
  accentStorageKey = 'quill-accent',
}: {
  /** Controlled theme. Omit to let the selector own `data-theme` on <html>. */
  value?: ThemeValue
  onValueChange?: (theme: ThemeValue) => void
  /** Controlled accent. Omit to let the selector own `data-accent` on <html>. */
  accent?: AccentValue
  onAccentChange?: (accent: AccentValue) => void
  /** localStorage keys used in uncontrolled mode. */
  storageKey?: string
  accentStorageKey?: string
}) {
  const [internalTheme, setInternalTheme] = useState<ThemeValue>('light')
  const [internalAccent, setInternalAccent] = useState<AccentValue>('moss')
  const themeControlled = value !== undefined
  const accentControlled = accent !== undefined
  const theme = themeControlled ? value : internalTheme
  const activeAccent = accentControlled ? accent : internalAccent
  const active = quillThemes.find((t) => t.value === theme) ?? quillThemes[0]

  useEffect(() => {
    // Read post-hydration: prerendered markup is always Dawn/moss, so
    // reading storage during render would mismatch.
    let storedTheme: string | null = null
    let storedAccent: string | null = null
    try {
      storedTheme = localStorage.getItem(storageKey)
      storedAccent = localStorage.getItem(accentStorageKey)
    } catch {}
    if (!themeControlled && isTheme(storedTheme)) {
      document.documentElement.setAttribute('data-theme', storedTheme)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalTheme(storedTheme)
    }
    if (!accentControlled && isAccent(storedAccent)) {
      document.documentElement.setAttribute('data-accent', storedAccent)
      setInternalAccent(storedAccent)
    }
  }, [themeControlled, accentControlled, storageKey, accentStorageKey])

  function selectTheme(next: ThemeValue) {
    if (!themeControlled) {
      setInternalTheme(next)
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem(storageKey, next)
      } catch {}
    }
    onValueChange?.(next)
  }

  function selectAccent(next: AccentValue) {
    if (!accentControlled) {
      setInternalAccent(next)
      document.documentElement.setAttribute('data-accent', next)
      try {
        localStorage.setItem(accentStorageKey, next)
      } catch {}
    }
    onAccentChange?.(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" aria-label={`Theme: ${active.label}`}>
            <ThemeGlyph icon={active.icon} />
            <span className="max-sm:hidden">{active.label}</span>
            <Icon name="keyboard_arrow_down" size={14} className="text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-menu">
        {/* Base UI: GroupLabel must live INSIDE a Group/RadioGroup. */}
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(next) => {
            if (isTheme(next)) selectTheme(next)
          }}
        >
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          {quillThemes.map((t) => (
            <DropdownMenuRadioItem key={t.value} value={t.value}>
              <ThemeGlyph icon={t.icon} />
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={activeAccent}
          onValueChange={(next) => {
            if (isAccent(next)) selectAccent(next)
          }}
        >
          <DropdownMenuLabel>Accent</DropdownMenuLabel>
          {quillAccents.map((a) => (
            <DropdownMenuRadioItem key={a.value} value={a.value}>
              <span className={`size-3.5 shrink-0 rounded-full border border-border ${a.swatch}`} aria-hidden />
              {a.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
