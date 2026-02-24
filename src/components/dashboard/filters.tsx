"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CalendarDays, Filter } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"

const eventColorMap: Record<string, string> = {
  all: "bg-foreground text-background",
  "333": "bg-chart-1/15 text-chart-1 border-chart-1/30",
  "444": "bg-primary/15 text-primary border-primary/30",
  "555": "bg-chart-3/15 text-chart-3 border-chart-3/30",
  "222": "bg-accent/15 text-accent border-accent/30",
  pyram: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  minx: "bg-chart-4/15 text-chart-4 border-chart-4/30",
}

const dateRanges = [
  { label: "7 days", value: "7d" as const },
  { label: "30 days", value: "30d" as const },
  { label: "90 days", value: "90d" as const },
  { label: "All time", value: "all" as const },
]

type DateRange = "7d" | "30d" | "90d" | "all"

export function DashboardFilters({
  selectedEvent,
  selectedRange,
  onEventChange,
  onRangeChange,
}: {
  selectedEvent: string
  selectedRange: DateRange
  onEventChange: (event: string) => void
  onRangeChange: (range: DateRange) => void
}) {
  const filterEvents = [
    { id: "all", label: "All Events" },
    ...WCA_EVENTS,
  ]

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4 shrink-0" />
            <span className="shrink-0">Event</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterEvents.map((event) => (
              <Badge
                key={event.id}
                variant="outline"
                className={`min-h-[44px] cursor-pointer px-3 transition-all ${
                  selectedEvent === event.id
                    ? eventColorMap[event.id] || "bg-foreground text-background"
                    : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
                onClick={() => onEventChange(event.id)}
              >
                {event.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {dateRanges.map((range) => (
              <Button
                key={range.value}
                variant="ghost"
                size="sm"
                className={`h-11 px-3 text-xs ${
                  selectedRange === range.value
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onRangeChange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
