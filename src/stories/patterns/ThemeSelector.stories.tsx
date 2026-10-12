import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ThemeSelector as ThemeSelectorBlock,
  type AccentValue,
  type ThemeValue,
} from '@registry/blocks/theme-selector'
import { usage } from '@/usage/theme-selector.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Nav / Theme selector',
  component: ThemeSelectorBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof ThemeSelectorBlock>
export default meta
type Story = StoryObj<typeof meta>

// Controlled demo: the selector drives data-theme AND data-accent on the
// preview card (the Storybook toolbar owns the canvas), so all sixteen
// theme × accent combinations can be tried in place. Installed uncontrolled,
// the block sets both attributes on <html> and persists to localStorage.
function Demo() {
  const [theme, setTheme] = useState<ThemeValue>('light')
  const [accent, setAccent] = useState<AccentValue>('moss')
  return (
    <div
      data-theme={theme}
      data-accent={accent}
      className="w-[520px] overflow-hidden rounded-xl border border-border bg-background shadow-sm transition-colors max-sm:w-[320px]"
    >
      <nav className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <span className="font-heading text-lg text-foreground">Quill</span>
        <ThemeSelectorBlock
          value={theme}
          onValueChange={setTheme}
          accent={accent}
          onAccentChange={setAccent}
        />
      </nav>
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="text-xs font-semibold tracking-[0.14em] uppercase text-[var(--text-accent-color)]">
          Issue Nº 001
        </span>
        <h2 className="font-heading text-2xl text-foreground">Distinctive yet familiar.</h2>
        <p className="max-w-[42ch] text-sm text-muted-foreground">
          Every artifact in the collection is approachable and accessible for everyday
          use by people —{' '}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="font-medium text-[var(--link)] underline underline-offset-2"
          >
            links follow the accent
          </a>
          .
        </p>
        <Button className="mt-2">Browse the collection</Button>
        <div className="mt-3 flex gap-2" aria-hidden>
          <span className="size-3.5 rounded-full bg-terracotta" />
          <span className="size-3.5 rounded-full bg-moss" />
          <span className="size-3.5 rounded-full bg-indigo" />
          <span className="size-3.5 rounded-full bg-gold" />
        </div>
      </div>
    </div>
  )
}

// The block is the trigger. Its own story shows exactly that, so Paper's page (the trigger)
// and the story stay a pair; the scene around it is the Demo story.
export const ThemeSelector: Story = {
  render: () => <ThemeSelectorBlock />,
}

export const Scene: Story = {
  render: () => <Demo />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="accent-shows-a-swatch"
      doExample={
        // pb-24 reserves room below the trigger for the defaultOpen menu
        // (portal-rendered, positioned by floating-ui) so it doesn't cover
        // the figcaption underneath.
        <div className="pb-24">
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm">Accent</Button>} />
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuRadioGroup defaultValue="moss">
                <DropdownMenuLabel>Accent</DropdownMenuLabel>
                <DropdownMenuRadioItem value="moss">
                  <span className="size-3.5 shrink-0 rounded-full border border-border bg-moss" aria-hidden />
                  Moss
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="terracotta">
                  <span className="size-3.5 shrink-0 rounded-full border border-border bg-terracotta" aria-hidden />
                  Terracotta
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
      dontExample={
        <div className="pb-24">
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm">Accent</Button>} />
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuRadioGroup defaultValue="moss">
                <DropdownMenuLabel>Accent</DropdownMenuLabel>
                <DropdownMenuRadioItem value="moss">Moss</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="terracotta">Terracotta</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    />
  ),
}
