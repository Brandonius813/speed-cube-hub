"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DateRange as DayPickerDateRange } from "react-day-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays, Filter } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { EventBadge } from "@/components/shared/event-badge"

const dateRanges = [
  { label: "7 days", value: "7d" as const },
  { label: "30 days", value: "30d" as const },
  { label: "90 days", value: "90d" as const },
  { label: "All time", value: "all" as const },
]

export type DateRange = "7d" | "30d" | "90d" | "all" | "custom"

export type CustomDateRange = {
  from: Date
  to: Date
}

export function DashboardFilters({
  selectedEvent,
  selectedRange,
  customRange,
  onEventChange,
  onRangeChange,
  onCustomRangeChange,
}: {
  selectedEvent: string
  selectedRange: DateRange
  customRange: CustomDateRange | null
  onEventChange: (event: string) => void
  onRangeChange: (range: DateRange) => void
  onCustomRangeChange: (range: CustomDateRange) => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<DayPickerDateRange | undefined>(
    customRange ? { from: customRange.from, to: customRange.to } : undefined
  )

  const filterEvents = [
    { id: "all", label: "All Events" },
    ...WCA_EVENTS,
  ]

  const handleCalendarSelect = (range: DayPickerDateRange | undefined) => {
    setPendingRange(range)
    // Auto-apply when both dates are selected
    if (range?.from && range?.to) {
      onCustomRangeChange({ from: range.from, to: range.to })
      onRangeChange("custom")
      setCalendarOpen(false)
    }
  }

  const customLabel = selectedRange === "custom" && customRange
    ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
    : "Custom"

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4 shrink-0" />
            <span className="shrink-0">Event</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterEvents.map((event) =>
              event.id === "all" ? (
                <Badge
                  key={event.id}
                  variant="outline"
                  className={`min-h-[44px] cursor-pointer px-3 transition-all ${
                    selectedEvent === "all"
                      ? "bg-foreground text-background"
                      : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                  onClick={() => onEventChange("all")}
                >
                  All Events
                </Badge>
              ) : (
                <div
                  key={event.id}
                  className="cursor-pointer"
                  onClick={() => onEventChange(event.id)}
                >
                  <EventBadge
                    event={event.id}
                    selected={selectedEvent === event.id}
                    className={`min-h-[44px] px-3 transition-all ${
                      selectedEvent !== event.id
                        ? "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
                        : ""
                    }`}
                  />
                </div>
              )
            )}
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
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-11 px-3 text-xs ${
                    selectedRange === "custom"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {customLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={pendingRange}
                  onSelect={handleCalendarSelect}
                  numberOfMonths={2}
                  disabled={{ after: new Date() }}
                  defaultMonth={
                    pendingRange?.from
                      ? new Date(pendingRange.from.getFullYear(), pendingRange.from.getMonth() - 1)
                      : new Date(new Date().getFullYear(), new Date().getMonth() - 1)
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
