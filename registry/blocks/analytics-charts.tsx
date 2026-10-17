'use client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from 'recharts'

const traffic = [
  { month: 'Jan', readers: 820, subscribers: 310 },
  { month: 'Feb', readers: 932, subscribers: 340 },
  { month: 'Mar', readers: 1105, subscribers: 415 },
  { month: 'Apr', readers: 1043, subscribers: 462 },
  { month: 'May', readers: 1290, subscribers: 550 },
  { month: 'Jun', readers: 1481, subscribers: 618 },
]
const trafficConfig = {
  readers: { label: 'Readers', color: 'var(--chart-1)' },
  subscribers: { label: 'Subscribers', color: 'var(--chart-2)' },
}

const sales = [
  { week: 'W1', prints: 12 },
  { week: 'W2', prints: 19 },
  { week: 'W3', prints: 14 },
  { week: 'W4', prints: 26 },
]
const salesConfig = {
  prints: { label: 'Print sales', color: 'var(--chart-3)' },
}

/** A dashboard pair — an area chart of audience growth beside a bar chart of weekly sales, each on its own card. */
export function AnalyticsCharts() {
  return (
    <div className="mx-auto grid w-full max-w-page grid-cols-[1.4fr_1fr] items-start gap-6 max-md:grid-cols-1">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Audience</CardTitle>
            <Badge variant="secondary">Last 6 months</Badge>
          </div>
          <CardDescription>Monthly readers and new subscribers.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trafficConfig} className="h-area w-full">
            <AreaChart data={traffic}>
              <XAxis dataKey="month" />
              <YAxis width={36} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                dataKey="readers"
                fill="var(--color-readers)"
                fillOpacity={0.2}
                stroke="var(--color-readers)"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="subscribers"
                fill="var(--color-subscribers)"
                fillOpacity={0.2}
                stroke="var(--color-subscribers)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Engagements</CardTitle>
          <CardDescription>Weekly engagements this month.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={salesConfig} className="h-area w-full">
            <BarChart data={sales}>
              <XAxis dataKey="week" />
              <YAxis width={28} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="prints" fill="var(--color-prints)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
