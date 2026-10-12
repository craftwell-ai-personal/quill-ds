'use client'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from 'recharts'
import { usage } from '@/usage/chart.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from './DoDont'

const chartData = [
  { month: 'Jan', lessons: 18 },
  { month: 'Feb', lessons: 24 },
  { month: 'Mar', lessons: 32 },
  { month: 'Apr', lessons: 28 },
  { month: 'May', lessons: 41 },
  { month: 'Jun', lessons: 38 },
]

const chartConfig = {
  lessons: { label: 'Lessons', color: 'var(--chart-1)' },
}

const multiSeriesData = [
  { month: 'Jan', lessons: 18, completions: 12 },
  { month: 'Feb', lessons: 24, completions: 19 },
  { month: 'Mar', lessons: 32, completions: 25 },
  { month: 'Apr', lessons: 28, completions: 21 },
  { month: 'May', lessons: 41, completions: 34 },
  { month: 'Jun', lessons: 38, completions: 30 },
]

const multiSeriesConfig = {
  lessons: { label: 'Lessons', color: 'var(--chart-1)' },
  completions: { label: 'Completions', color: 'var(--chart-2)' },
}

// Deliberately wrong: raw UI pigments instead of the chart-only token cuts.
// terracotta/moss is the exact adjacency the source code calls out as failing
// deuteranopia separation (src/tokens/quill.tokens.mjs, chart-token comment).
const rawPigmentConfig = {
  lessons: { label: 'Lessons', color: 'var(--terracotta)' },
  completions: { label: 'Completions', color: 'var(--moss)' },
}

const meta = {
  title: 'Components / Chart',
  component: ChartContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
  argTypes: {
    className: { table: { disable: true } },
  },
} as Meta<typeof ChartContainer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Bar Chart',
  render: () => (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={chartData}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="lessons" fill="var(--color-lessons)" radius={4} />
      </BarChart>
    </ChartContainer>
  ),
}

export const LineChartStory: Story = {
  name: 'Line Chart',
  render: () => (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={chartData}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="lessons" stroke="var(--color-lessons)" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ChartContainer>
  ),
}

export const WithLegend: Story = {
  name: 'Multi-Series with Legend',
  render: () => (
    <ChartContainer config={multiSeriesConfig} className="h-64 w-full">
      <BarChart data={multiSeriesData}>
        <XAxis dataKey="month" />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="lessons" fill="var(--color-lessons)" radius={4} />
        <Bar dataKey="completions" fill="var(--color-completions)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  ),
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  // At h-40 Recharts drops whichever tick label would crowd (it hid 45, leaving 0/15/30/60); three ticks always fit.
  render: () => (
    <DoDontPair
      usage={usage}
      id="chart-tokens-fixed-order"
      doExample={
        <ChartContainer config={multiSeriesConfig} className="h-40 w-full">
          <BarChart data={multiSeriesData}>
            <XAxis dataKey="month" />
            <YAxis tickCount={3} />
            <Bar dataKey="lessons" fill="var(--color-lessons)" radius={4} />
            <Bar dataKey="completions" fill="var(--color-completions)" radius={4} />
          </BarChart>
        </ChartContainer>
      }
      dontExample={
        <ChartContainer config={rawPigmentConfig} className="h-40 w-full">
          <BarChart data={multiSeriesData}>
            <XAxis dataKey="month" />
            <YAxis tickCount={3} />
            <Bar dataKey="lessons" fill="var(--color-lessons)" radius={4} />
            <Bar dataKey="completions" fill="var(--color-completions)" radius={4} />
          </BarChart>
        </ChartContainer>
      }
    />
  ),
}
