"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DateRange as DayPickerDateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays, ChevronDown } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"

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

const EVENT_CATEGORIES = ["NxN", "Blindfolded", "One-Handed", "Other", "Fewest Moves"] as const

function getEventTriggerLabel(selectedEvents: string[]): React.ReactNode {
  if (selectedEvents.length === 0) return "All Events"
  if (selectedEvents.length === 1) {
    const event = WCA_EVENTS.find((e) => e.id === selectedEvents[0])
    return (
      <span className="flex items-center gap-1.5">
        <CubingIcon event={selectedEvents[0]} className="text-[0.85em]" />
        {event?.label ?? selectedEvents[0]}
      </span>
    )
  }
  return `${selectedEvents.length} events`
}

export function DashboardFilters({
  selectedEvents,
  selectedRange,
  customRange,
  onEventsChange,
  onRangeChange,
  onCustomRangeChange,
}: {
  selectedEvents: string[]
  selectedRange: DateRange
  customRange: CustomDateRange | null
  onEventsChange: (events: string[]) => void
  onRangeChange: (range: DateRange) => void
  onCustomRangeChange: (range: CustomDateRange) => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [pendingRange, setPendingRange] = useState<DayPickerDateRange | undefined>(
    customRange ? { from: customRange.from, to: customRange.to } : undefined
  )

  const handleCalendarSelect = (range: DayPickerDateRange | undefined) => {
    setPendingRange(range)
    if (range?.from && range?.to) {
      onCustomRangeChange({ from: range.from, to: range.to })
      onRangeChange("custom")
      setCalendarOpen(false)
    }
  }

  const toggleEvent = (eventId: string) => {
    if (selectedEvents.includes(eventId)) {
      onEventsChange(selectedEvents.filter((e) => e !== eventId))
    } else {
      onEventsChange([...selectedEvents, eventId])
    }
  }

  const customLabel = selectedRange === "custom" && customRange
    ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
    : "Custom"

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Popover open={eventsOpen} onOpenChange={setEventsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={eventsOpen}
              className="min-h-11 w-full justify-between border-border/50 sm:w-[200px]"
            >
              <span className="truncate">
                {getEventTriggerLabel(selectedEvents)}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0" align="start">
            <div className="max-h-[300px] overflow-y-auto p-2">
              {/* Clear all / select all */}
              <button
                onClick={() => onEventsChange([])}
                className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selectedEvents.length === 0
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                All Events
              </button>
              <div className="my-1 border-t border-border/30" />

              {EVENT_CATEGORIES.map((category) => {
                const events = WCA_EVENTS.filter((e) => e.category === category)
                if (events.length === 0) return null
                return (
                  <div key={category} className="mb-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {category}
                    </p>
                    {events.map((event) => {
                      const checked = selectedEvents.includes(event.id)
                      return (
                        <label
                          key={event.id}
                          className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary/50"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleEvent(event.id)}
                          />
                          <CubingIcon event={event.id} className="text-[0.85em]" />
                          <span className="text-sm text-foreground">{event.label}</span>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

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
