import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Wizard as WizardBlock } from '@registry/blocks/wizard'
import { Icon } from '@/components/ui/icon'
import { usage } from '@/usage/wizard.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Forms / Wizard',
  component: WizardBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof WizardBlock>
export default meta
type Story = StoryObj<typeof meta>

export const Wizard: Story = {
  render: () => <WizardBlock />,
}

const wizardSteps = ['Account', 'Workspace', 'Invite'] as const

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="always-show-full-sequence"
      doExample={
        <div className="flex w-[380px] max-w-full flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <ol className="flex items-center gap-2">
            {wizardSteps.map((s, i) => {
              const state = i === 0 ? 'done' : i === 1 ? 'current' : 'todo'
              return (
                <li key={s} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      state === 'done'
                        ? 'bg-primary text-primary-foreground'
                        : state === 'current'
                          ? 'bg-primary/10 text-primary ring-1 ring-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {state === 'done' ? <Icon name="check" className="size-icon-sm" /> : i + 1}
                  </span>
                  <span className={`text-sm ${state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {s}
                  </span>
                  {i < wizardSteps.length - 1 && <span className="h-px flex-1 bg-border" />}
                </li>
              )
            })}
          </ol>
          <span className="text-sm font-medium text-foreground">Name your workspace</span>
        </div>
      }
      dontExample={
        <div className="flex w-[380px] max-w-full flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4">
          <span className="text-xs font-medium text-muted-foreground">Step 2</span>
          <span className="text-sm font-medium text-foreground">Name your workspace</span>
        </div>
      }
    />
  ),
}
