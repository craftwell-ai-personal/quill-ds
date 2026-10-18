import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SearchResults as SearchResultsBlock } from '@registry/blocks/search-results'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'
import { Separator } from '@/components/ui/separator'
import { usage } from '@/usage/search-results.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Data / Search results',
  component: SearchResultsBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof SearchResultsBlock>
export default meta
type Story = StoryObj<typeof meta>

export const SearchResults: Story = {
  render: () => <SearchResultsBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="announce-result-count"
      doExample={
        <div className="flex w-[360px] flex-col gap-3 text-foreground">
          <Input placeholder="Search the docs…" defaultValue="token" aria-label="Search" />
          <p className="text-xs text-muted-foreground">2 results for &quot;token&quot;</p>
          <ul className="overflow-hidden rounded-lg border border-border">
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon name="description" className="size-icon-lg" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">Design tokens</span>
                  <span className="text-xs text-muted-foreground">Docs › Foundations</span>
                </div>
                <Badge variant="outline">Guide</Badge>
              </a>
            </li>
            <li>
              <Separator />
              <a href="#" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon name="description" className="size-icon-lg" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">Button component</span>
                  <span className="text-xs text-muted-foreground">Components › Button</span>
                </div>
                <Badge variant="outline">Component</Badge>
              </a>
            </li>
          </ul>
        </div>
      }
      dontExample={
        <div className="flex w-[360px] flex-col gap-3 text-foreground">
          <Input placeholder="Search the docs…" defaultValue="token" aria-label="Search" />
          <ul className="overflow-hidden rounded-lg border border-border">
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon name="description" className="size-icon-lg" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">Design tokens</span>
                  <span className="text-xs text-muted-foreground">Docs › Foundations</span>
                </div>
                <Badge variant="outline">Guide</Badge>
              </a>
            </li>
            <li>
              <Separator />
              <a href="#" className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon name="description" className="size-icon-lg" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">Button component</span>
                  <span className="text-xs text-muted-foreground">Components › Button</span>
                </div>
                <Badge variant="outline">Component</Badge>
              </a>
            </li>
          </ul>
        </div>
      }
    />
  ),
}
