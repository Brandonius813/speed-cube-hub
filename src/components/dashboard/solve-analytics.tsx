"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, BarChart3 } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { WCA_EVENTS } from "@/lib/constants"
import { TimeDistributionChart } from "@/components/shared/time-distribution-chart"
import { TimeTrendChart } from "@/components/shared/time-trend-chart"
import { getEventAnalytics } from "@/lib/actions/timer-analytics"
import type { TimerEventAnalytics } from "@/lib/types"

/**
 * Solve Analytics section for the Practice Stats page.
 * Lets users select an event and view time distribution + trend charts
 * using individual solve data from the timer.
 */
export function SolveAnalytics({
  practicedEvents,
}: {
  /** Event IDs that appear in the user's sessions — used to populate the dropdown */
  practicedEvents: string[]
}) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<TimerEventAnalytics | null>(null)
  const [isLoading, startTransition] = useTransition()
  const [eventOpen, setEventOpen] = useState(false)

  const handleSelectEvent = (eventId: string) => {
    setSelectedEvent(eventId)
    setAnalytics(null)
    setEventOpen(false)
    startTransition(async () => {
      const { data } = await getEventAnalytics(eventId)
      setAnalytics(data)
    })
  }

  const selectedLabel = selectedEvent
    ? WCA_EVENTS.find((e) => e.id === selectedEvent)?.label ?? selectedEvent
    : null

  // No events with sessions → show empty state
  if (practicedEvents.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Solve Analytics</CardTitle>
          </div>

          {/* Event selector */}
          <Popover open={eventOpen} onOpenChange={setEventOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-h-9 gap-1.5 border-border/50"
              >
                {selectedEvent ? (
                  <>
                    <CubingIcon event={selectedEvent} className="text-[0.85em]" />
                    <span className="truncate">{selectedLabel}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select event</span>
                )}
                <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2" align="end">
              <div className="max-h-[300px] overflow-y-auto">
                {practicedEvents.map((eventId) => {
                  const ev = WCA_EVENTS.find((e) => e.id === eventId)
                  return (
                    <button
                      key={eventId}
                      onClick={() => handleSelectEvent(eventId)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        selectedEvent === eventId
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <CubingIcon event={eventId} className="text-[0.85em]" />
                      {ev?.label ?? eventId}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </CardHeader>

        <CardContent>
          {!selectedEvent && (
            <p className="text-sm text-muted-foreground">
              Select an event above to view solve-level analytics from the built-in timer.
            </p>
          )}

          {selectedEvent && isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading solves...
            </p>
          )}

          {selectedEvent && !isLoading && !analytics?.summary?.solve_count && (
            <p className="text-sm text-muted-foreground">
              No timer solves found for {selectedLabel}. Use the built-in timer to start tracking!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Charts — only show when we have data */}
      {selectedEvent && !isLoading && analytics?.summary?.solve_count ? (
        <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
          <TimeDistributionChart
            buckets={analytics.distribution.map((bucket, index, list) => {
              const cumulative = list
                .slice(0, index + 1)
                .reduce((sum, entry) => sum + entry.solve_count, 0)
              const total = analytics.summary?.solve_count ?? 0
              return {
                tickLabel: `${Math.round(bucket.range_start_ms / 1000)}s`,
                tooltipLabel:
                  bucket.range_start_ms === bucket.range_end_ms
                    ? `${(bucket.range_start_ms / 1000).toFixed(2)}s`
                    : `${(bucket.range_start_ms / 1000).toFixed(2)}-${(bucket.range_end_ms / 1000).toFixed(2)}s`,
                count: bucket.solve_count,
                cumulative,
                percent: total > 0 ? (bucket.solve_count / total) * 100 : 0,
              }
            })}
          />
          <TimeTrendChart
            points={analytics.trend.map((point) => ({
              label: point.label,
              time: point.best_single_ms,
              line1: point.mean_ms,
              line2: null,
            }))}
            line1Label="Daily Mean"
          />
        </div>
      ) : null}
    </div>
  )
}
