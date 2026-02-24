"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DateRange as DayPickerDateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays } from "lucide-react"
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

  const handleCalendarSelect = (range: DayPickerDateRange | undefined) => {
    setPendingRange(range)
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
        <Select value={selectedEvent} onValueChange={onEventChange}>
          <SelectTrigger className="min-h-11 w-full sm:w-[200px]">
            <SelectValue>
              {selectedEvent === "all" ? (
                "All Events"
              ) : (
                <>
                  <CubingIcon event={selectedEvent} className="text-[0.85em]" />
                  {WCA_EVENTS.find((e) => e.id === selectedEvent)?.label ?? selectedEvent}
                </>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {EVENT_CATEGORIES.map((category) => {
              const events = WCA_EVENTS.filter((e) => e.category === category)
              if (events.length === 0) return null
              return (
                <SelectGroup key={category}>
                  <SelectLabel>{category}</SelectLabel>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      <CubingIcon event={event.id} className="text-[0.85em]" />
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>

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
