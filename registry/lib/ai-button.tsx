import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AiMark } from '@/components/ui/ai-mark'

/** A stock Quill button that runs an AI action, marked with the AI sparkle; the label stays plain ink. */
export function AiButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button {...props}>
      {/* quill-check: allow icon-size — the mark is 18px, above the Button's 16px icons; Button skips an svg with a size- class */}
      <AiMark size="icon-lg" className="size-icon-lg" />
      {children}
    </Button>
  )
}
