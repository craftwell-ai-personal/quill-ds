'use client'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const sessions = [
  { time: '9:00', title: 'Design review', kind: 'Internal' },
  { time: '11:30', title: 'Token sync with Northwind', kind: 'Call' },
  { time: '15:00', title: 'Working session', kind: 'Workshop' },
]

/** A single-date calendar paired with the selected day's session list, in one studio-schedule card. */
export function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 6, 14))
  return (
    <Card className="w-fit">
      <CardHeader>
        <CardTitle>Week ahead</CardTitle>
        <CardDescription>Pick a day to see its sessions.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-start gap-6 max-md:flex-col">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          defaultMonth={new Date(2026, 6)}
          className="rounded-lg border border-border"
        />
        <div className="flex w-rail flex-col gap-3">
          <span className="text-sm font-medium text-foreground">Tuesday, July 14</span>
          <Separator />
          <ul className="flex flex-col gap-3">
            {sessions.map((s) => (
              <li key={s.time} className="flex items-start gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-xs font-medium text-muted-foreground">
                  {s.time}
                </span>
                <div className="flex flex-col items-start gap-1">
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                  <Badge variant="outline">{s.kind}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
