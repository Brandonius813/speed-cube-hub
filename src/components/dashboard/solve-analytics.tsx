"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ArrowLeft, BarChart3, ChevronDown, Layers } from "lucide-react"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { ALL_TIMER_EVENTS } from "@/lib/constants"
import { TimeDistributionChart } from "@/components/shared/time-distribution-chart"
import { TimeTrendChart } from "@/components/shared/time-trend-chart"
import { SolveAnalyticsStatsGrid } from "@/components/dashboard/solve-analytics-stats-grid"
import { SolveAnalyticsEventOverview } from "@/components/dashboard/solve-analytics-event-overview"
import {
  getSolvesInRange,
  getSolvesInRangeMulti,
} from "@/lib/actions/timer-range-analytics"
import {
  computeRangeStats,
  rangeLabel as buildRangeLabel,
  resolveRangeWindow,
} from "@/lib/timer/range-stats"
import type {
  DateRange,
  CustomDateRange,
} from "@/components/dashboard/filters"
import type { Solve } from "@/lib/types"

const ALL_EVENTS_VALUE = "__all__"

function getEventLabel(eventId: string): string {
  return ALL_TIMER_EVENTS.find((e) => e.id === eventId)?.label ?? eventId
}

export function SolveAnalytics({
  userId,
  practicedEvents,
  range,
  customRange,
}: {
  userId: string
  practicedEvents: string[]
  range: DateRange
  customRange: CustomDateRange | null
}) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [solves, setSolves] = useState<Solve[]>([])
  const [byEvent, setByEvent] = useState<Record<string, Solve[]>>({})
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)

  const window = useMemo(
    () => resolveRangeWindow(range, customRange),
    [range, customRange],
  )

  const label = useMemo(
    () => buildRangeLabel(range, customRange),
    [range, customRange],
  )

  const sortedEvents = useMemo(
    () => [...practicedEvents].sort(),
    [practicedEvents],
  )

  const eventsKey = useMemo(() => sortedEvents.join(","), [sortedEvents])

  const fetchKeyRef = useRef<string>("")

  useEffect(() => {
    if (sortedEvents.length === 0) {
      setSolves([])
      setByEvent({})
      setTruncated(false)
      return
    }

    const fetchKey = `${userId}|${window.fromIso ?? ""}|${window.toIso ?? ""}|${
      selectedEvent ?? ALL_EVENTS_VALUE
    }|${eventsKey}`
    if (fetchKey === fetchKeyRef.current) return
    fetchKeyRef.current = fetchKey

    setError(null)

    startTransition(async () => {
      if (selectedEvent) {
        const result = await getSolvesInRange({
          userId,
          event: selectedEvent,
          fromIso: window.fromIso,
          toIso: window.toIso,
        })
        if (fetchKeyRef.current !== fetchKey) return
        if (result.error) {
          setError(result.error)
          setSolves([])
          setTruncated(false)
        } else {
          setSolves(result.solves)
          setTruncated(result.truncated)
        }
      } else {
        const result = await getSolvesInRangeMulti({
          userId,
          events: sortedEvents,
          fromIso: window.fromIso,
          toIso: window.toIso,
        })
        if (fetchKeyRef.current !== fetchKey) return
        if (result.error) {
          setError(result.error)
          setByEvent({})
          setTruncated(false)
        } else {
          setByEvent(result.byEvent)
          setTruncated(result.truncated)
        }
      }
    })
  }, [userId, window, selectedEvent, sortedEvents, eventsKey])

  const stats = useMemo(() => computeRangeStats(solves), [solves])

  const handleSelectEvent = (eventId: string | null) => {
    setSelectedEvent(eventId)
    setPickerOpen(false)
  }

  if (sortedEvents.length === 0) {
    return null
  }

  const triggerLabel = selectedEvent ? (
    <>
      <CubingIcon event={selectedEvent} className="text-[0.85em]" />
      <span className="truncate">{getEventLabel(selectedEvent)}</span>
    </>
  ) : (
    <>
      <Layers className="h-3.5 w-3.5" />
      <span className="truncate">All events</span>
    </>
  )

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-2 pb-3">
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <CardTitle className="text-foreground">Solve Analytics</CardTitle>
              <p className="truncate text-xs text-muted-foreground">{label}</p>
            </div>
          </div>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-h-9 shrink-0 gap-1.5 border-border/50"
              >
                {triggerLabel}
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="end">
              <div className="max-h-[320px] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleSelectEvent(null)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                    selectedEvent === null
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  All practiced events
                </button>
                <div className="my-1 border-t border-border/30" />
                {sortedEvents.map((eventId) => (
                  <button
                    key={eventId}
                    type="button"
                    onClick={() => handleSelectEvent(eventId)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      selectedEvent === eventId
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <CubingIcon event={eventId} className="text-[0.85em]" />
                    {getEventLabel(eventId)}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>

        <CardContent className="space-y-3">
          {selectedEvent !== null && (
            <button
              type="button"
              onClick={() => handleSelectEvent(null)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All events
            </button>
          )}

          {isLoading && (
            <p className="animate-pulse text-sm text-muted-foreground">
              Loading solves…
            </p>
          )}

          {!isLoading && error && (
            <p className="text-sm text-destructive">Couldn’t load solves: {error}</p>
          )}

          {!isLoading && !error && truncated && (
            <p className="rounded-md border border-border/50 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              Showing the most recent 5,000 solves in this range. Pick a tighter
              date range to focus the view.
            </p>
          )}

          {!isLoading &&
            !error &&
            selectedEvent !== null &&
            solves.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No timer solves for {getEventLabel(selectedEvent)} in {label.toLowerCase()}.
              </p>
            )}
        </CardContent>
      </Card>

      {!isLoading && !error && selectedEvent === null && (
        <SolveAnalyticsEventOverview
          byEvent={byEvent}
          rangeLabel={label}
          onSelectEvent={(eventId) => handleSelectEvent(eventId)}
        />
      )}

      {!isLoading && !error && selectedEvent !== null && solves.length > 0 && (
        <>
          <SolveAnalyticsStatsGrid stats={stats} rangeLabel={label} />
          <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
            <TimeDistributionChart solves={solves} />
            <TimeTrendChart solves={solves} statCols={["ao5", "ao12"]} />
          </div>
        </>
      )}
    </div>
  )
}
