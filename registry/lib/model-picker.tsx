'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Icon } from '@/components/ui/icon'
import { ToneBadge } from '@/components/ui/tone-badge'
import { cn } from '@/lib/utils'

export type ModelOption = {
  value: string
  label: string
  /** One line on what it is good for. */
  description?: string
  /** A short tag such as "New". */
  badge?: string
}

export const AUTO_MODEL: ModelOption = { value: 'auto', label: 'Auto', description: 'Picks the right model for each message' }

/** Lets people choose which AI model answers — a quiet name-and-chevron trigger in the composer that opens a list with Auto first, a line on what each model is good for, and a check on the current one. */
export function ModelPicker({
  models, value, onValueChange, auto = AUTO_MODEL, label = 'Model', className,
}: {
  models: ModelOption[]
  value: string
  onValueChange: (value: string) => void
  /** The first option; false leaves it out. */
  auto?: ModelOption | false
  label?: string
  className?: string
}) {
  const all = auto ? [auto, ...models] : models
  // Nothing to choose from: draw nothing rather than an empty trigger.
  if (!all.length) return null
  // A value the list no longer has (a retired model) shows the first option, never an empty trigger.
  const current = all.find((m) => m.value === value) ?? all[0]
  const row = (m: ModelOption) => (
    // items-start keeps the check on the name row's line, not centred on the name plus description.
    <DropdownMenuRadioItem key={m.value} value={m.value} className="items-start py-1.5">
      <span className="grid">
        {/* Fixed line height on the row so the badge and the check share the name's centre line. */}
        <span className="flex h-5 items-center gap-1.5">
          <span data-model-name>{m.label}</span>
          {m.badge ? <ToneBadge tone="moss" size="sm">{m.badge}</ToneBadge> : null}
        </span>
        {m.description ? <span className="text-xs text-muted-foreground">{m.description}</span> : null}
      </span>
    </DropdownMenuRadioItem>
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="ghost" size="sm" className={cn('rounded-full text-ink-soft', className)} aria-label={`${label}: ${current.label}`}>
            {current.label}
            <Icon name="keyboard_arrow_down" size={14} />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-panel">
        {/* Base UI: a GroupLabel must live inside a Group or RadioGroup. */}
        <DropdownMenuRadioGroup value={current.value} onValueChange={(v) => onValueChange(String(v))}>
          {auto ? row(auto) : null}
          {auto && models.length ? <DropdownMenuSeparator /> : null}
          {auto && models.length ? <DropdownMenuLabel>Choose</DropdownMenuLabel> : null}
          {models.map(row)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
