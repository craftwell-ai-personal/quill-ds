import * as React from 'react'
import { Button } from '@/components/ui/button'
import { AiMark } from '@/components/ui/ai-mark'

/** A stock Quill button that runs an AI action, marked with the AI sparkle; the label stays plain ink. */
export function AiButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button {...props}>
      {/* size-[18px]: Button sizes any svg without a size- class to 16px. */}
      <AiMark size={18} className="size-4.5" />
      {children}
    </Button>
  )
}
