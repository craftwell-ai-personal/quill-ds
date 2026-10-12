import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { usage } from '@/usage/resizable.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from './DoDont'

const meta = {
  title: 'Components / Resizable',
  component: ResizablePanelGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Split direction',
      table: { defaultValue: { summary: 'horizontal' } },
    },
  },
} satisfies Meta<typeof ResizablePanelGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="h-48! max-w-md rounded-lg border border-border">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Panel A</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Panel B</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

// The panel library sets an inline height: 100% on the group, which beats a plain h-* class; the ! makes the height stick.
export const Vertical: Story = {
  render: () => (
    <ResizablePanelGroup orientation="vertical" className="h-64! max-w-sm rounded-lg border border-border">
      <ResizablePanel defaultSize={60}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Top panel</div>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={40}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Bottom panel</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

export const WithHandle: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="h-48! max-w-md rounded-lg border border-border">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Sidebar</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Main content</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

export const ThreePanel: Story = {
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="h-48! max-w-2xl rounded-lg border border-border">
      <ResizablePanel defaultSize={25}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">File tree</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Editor</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25}>
        <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">Preview</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="withhandle-for-visible-grip"
      doExample={
        <ResizablePanelGroup orientation="horizontal" className="h-32! max-w-xs rounded-lg border border-border">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">A</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">B</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      }
      dontExample={
        <ResizablePanelGroup orientation="horizontal" className="h-32! max-w-xs rounded-lg border border-border">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">A</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4 text-sm text-ink-muted">B</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      }
    />
  ),
}
