import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { usage } from '@/usage/tabs.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair, inColumn } from './DoDont'

// One width for the component's own stories and for each example in its Do/Don't pair.
const COLUMN = 'w-80'

const meta = {
  title: 'Components / Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Tab orientation',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    className: { table: { disable: true } },
  },
  decorators: [inColumn(COLUMN)],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <Card>
          <CardContent className="text-sm text-ink-soft">
            An introduction to the course structure, goals, and materials needed.
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="curriculum">
        <Card>
          <CardContent className="text-sm text-ink-soft">
            12 lessons covering foundational to advanced techniques.
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reviews">
        <Card>
          <CardContent className="text-sm text-ink-soft">
            4.8 stars · 124 reviews
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
}

export const LineVariant: Story = {
  render: () => (
    <Tabs defaultValue="active">
      <TabsList variant="line">
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="drafts">Drafts</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <p className="pt-3 text-sm text-ink-soft">3 active courses</p>
      </TabsContent>
      <TabsContent value="drafts">
        <p className="pt-3 text-sm text-ink-soft">1 draft in progress</p>
      </TabsContent>
      <TabsContent value="archived">
        <p className="pt-3 text-sm text-ink-soft">No archived courses</p>
      </TabsContent>
    </Tabs>
  ),
}

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="account" orientation="vertical" className="flex gap-4">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="notifications">Notifications</TabsTrigger>
      </TabsList>
      <div className="flex-1">
        <TabsContent value="account">
          <p className="text-sm text-ink-soft">Manage your profile and preferences.</p>
        </TabsContent>
        <TabsContent value="billing">
          <p className="text-sm text-ink-soft">View invoices and payment methods.</p>
        </TabsContent>
        <TabsContent value="notifications">
          <p className="text-sm text-ink-soft">Configure email and push alerts.</p>
        </TabsContent>
      </div>
    </Tabs>
  ),
}

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-xs text-ink-muted mb-3">Default (segment)</p>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">One</TabsTrigger>
            <TabsTrigger value="b">Two</TabsTrigger>
            <TabsTrigger value="c">Three</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <p className="pt-2 text-sm text-ink-soft">Content for One</p>
          </TabsContent>
          <TabsContent value="b">
            <p className="pt-2 text-sm text-ink-soft">Content for Two</p>
          </TabsContent>
          <TabsContent value="c">
            <p className="pt-2 text-sm text-ink-soft">Content for Three</p>
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-3">Line (underline)</p>
        <Tabs defaultValue="a">
          <TabsList variant="line">
            <TabsTrigger value="a">One</TabsTrigger>
            <TabsTrigger value="b">Two</TabsTrigger>
            <TabsTrigger value="c">Three</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <p className="pt-2 text-sm text-ink-soft">Content for One</p>
          </TabsContent>
          <TabsContent value="b">
            <p className="pt-2 text-sm text-ink-soft">Content for Two</p>
          </TabsContent>
          <TabsContent value="c">
            <p className="pt-2 text-sm text-ink-soft">Content for Three</p>
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-3">Disabled tab</p>
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">One</TabsTrigger>
            <TabsTrigger value="b" disabled>Two (disabled)</TabsTrigger>
            <TabsTrigger value="c">Three</TabsTrigger>
          </TabsList>
          <TabsContent value="a">
            <p className="pt-2 text-sm text-ink-soft">Content for One</p>
          </TabsContent>
          <TabsContent value="c">
            <p className="pt-2 text-sm text-ink-soft">Content for Three</p>
          </TabsContent>
        </Tabs>
      </div>
      <div>
        <p className="text-xs text-ink-muted mb-3">Vertical orientation</p>
        <Tabs defaultValue="a" orientation="vertical" className="flex gap-4">
          <TabsList>
            <TabsTrigger value="a">One</TabsTrigger>
            <TabsTrigger value="b">Two</TabsTrigger>
            <TabsTrigger value="c">Three</TabsTrigger>
          </TabsList>
          <div className="flex-1">
            <TabsContent value="a">
              <p className="text-sm text-ink-soft">Content for One</p>
            </TabsContent>
            <TabsContent value="b">
              <p className="text-sm text-ink-soft">Content for Two</p>
            </TabsContent>
            <TabsContent value="c">
              <p className="text-sm text-ink-soft">Content for Three</p>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair exampleClassName={COLUMN}
      usage={usage}
      id="trigger-value-matches-content"
      doExample={
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="pt-2 text-sm text-ink-soft">Course overview goes here.</p>
          </TabsContent>
          <TabsContent value="curriculum">
            <p className="pt-2 text-sm text-ink-soft">12 lessons, foundational to advanced.</p>
          </TabsContent>
        </Tabs>
      }
      dontExample={
        <Tabs defaultValue="curriculum">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="pt-2 text-sm text-ink-soft">Course overview goes here.</p>
          </TabsContent>
          <TabsContent value="curriculum-typo">
            <p className="pt-2 text-sm text-ink-soft">12 lessons, foundational to advanced.</p>
          </TabsContent>
        </Tabs>
      }
    />
  ),
}
