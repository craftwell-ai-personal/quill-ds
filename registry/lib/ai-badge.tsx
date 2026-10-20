import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { AiMark } from '@/components/ui/ai-mark'
import { cn } from '@/lib/utils'

/** A small outline pill with the AI sparkle that marks content an AI made or suggested — "AI draft", "Suggested". */
export function AiBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Badge variant="outline" className={cn('gap-1 border-input bg-background text-ink-soft', className)}>
      <AiMark size="icon-xs" />
      {children}
    </Badge>
  )
}
