"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DateRange as DayPickerDateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarDays, ChevronDown, Search, X } from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"

const dateRanges = [
  { label: "Today", value: "1d" as const },
  { label: "7d", value: "7d" as const },
  { label: "30d", value: "30d" as const },
  { label: "90d", value: "90d" as const },
  { label: "1y", value: "1y" as const },
  { label: "365d", value: "365d" as const },
  { label: "All", value: "all" as const },
]

export type DateRange = "1d" | "7d" | "30d" | "90d" | "1y" | "365d" | "all" | "custom"

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

function getPracticeTypeTriggerLabel(selected: string[]): string {
  if (selected.length === 0) return "All Types"
  if (selected.length === 1) return selected[0]
  return `${selected.length} types`
}

export function DashboardFilters({
  selectedEvents,
  selectedRange,
  customRange,
  selectedPracticeTypes,
  searchNotes,
  availablePracticeTypes,
  onEventsChange,
  onRangeChange,
  onCustomRangeChange,
  onPracticeTypesChange,
  onSearchNotesChange,
  onClearFilters,
}: {
  selectedEvents: string[]
  selectedRange: DateRange
  customRange: CustomDateRange | null
  selectedPracticeTypes: string[]
  searchNotes: string
  availablePracticeTypes: string[]
  onEventsChange: (events: string[]) => void
  onRangeChange: (range: DateRange) => void
  onCustomRangeChange: (range: CustomDateRange) => void
  onPracticeTypesChange: (types: string[]) => void
  onSearchNotesChange: (search: string) => void
  onClearFilters: () => void
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)
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

  const togglePracticeType = (type: string) => {
    if (selectedPracticeTypes.includes(type)) {
      onPracticeTypesChange(selectedPracticeTypes.filter((t) => t !== type))
    } else {
      onPracticeTypesChange([...selectedPracticeTypes, type])
    }
  }

  const hasActiveFilters =
    selectedEvents.length > 0 ||
    selectedPracticeTypes.length > 0 ||
    searchNotes.length > 0 ||
    selectedRange !== "30d"

  const customLabel = selectedRange === "custom" && customRange
    ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
    : "Custom"

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex flex-col gap-3 p-4">
        {/* Row 1: Dropdowns + search */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Event filter */}
          <Popover open={eventsOpen} onOpenChange={setEventsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={eventsOpen}
                className="min-h-11 w-full justify-between border-border/50 sm:w-[180px]"
              >
                <span className="truncate">
                  {getEventTriggerLabel(selectedEvents)}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-2">
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
                      {events.map((event) => (
                        <label
                          key={event.id}
                          className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary/50"
                        >
                          <Checkbox
                            checked={selectedEvents.includes(event.id)}
                            onCheckedChange={() => toggleEvent(event.id)}
                          />
                          <CubingIcon event={event.id} className="text-[0.85em]" />
                          <span className="text-sm text-foreground">{event.label}</span>
                        </label>
                      ))}
                    </div>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Practice type filter */}
          <Popover open={typesOpen} onOpenChange={setTypesOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={typesOpen}
                className="min-h-11 w-full justify-between border-border/50 sm:w-[160px]"
              >
                <span className="truncate">
                  {getPracticeTypeTriggerLabel(selectedPracticeTypes)}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <div className="max-h-[300px] overflow-y-auto p-2">
                <button
                  onClick={() => onPracticeTypesChange([])}
                  className={`mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedPracticeTypes.length === 0
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  All Types
                </button>
                <div className="my-1 border-t border-border/30" />
                {availablePracticeTypes.map((type) => (
                  <label
                    key={type}
                    className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary/50"
                  >
                    <Checkbox
                      checked={selectedPracticeTypes.includes(type)}
                      onCheckedChange={() => togglePracticeType(type)}
                    />
                    <span className="text-sm text-foreground">{type}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Search notes */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchNotes}
              onChange={(e) => onSearchNotesChange(e.target.value)}
              className="min-h-11 border-border/50 pl-9"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="min-h-11 shrink-0 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>

        {/* Row 2: Date range */}
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {dateRanges.map((range) => (
              <Button
                key={range.value}
                variant="ghost"
                size="sm"
                className={`h-9 px-2.5 text-xs ${
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
                  className={`h-9 px-2.5 text-xs ${
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
