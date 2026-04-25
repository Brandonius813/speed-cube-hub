"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { ALL_TIMER_EVENTS } from "@/lib/constants"
import {
  computeAoN,
  formatTimeMsCentiseconds,
  getEffectiveTime,
} from "@/lib/timer/averages"
import type { Solve } from "@/lib/types"

type EventCardData = {
  eventId: string
  label: string
  count: number
  best: number | null
  meanOrAo5: number | null
  meanOrAo5Label: string
  ao12: number | null
}

function getEventLabel(eventId: string): string {
  const found = ALL_TIMER_EVENTS.find((e) => e.id === eventId)
  return found?.label ?? eventId
}

function fmt(ms: number | null): string {
  if (ms === null) return "—"
  return formatTimeMsCentiseconds(ms)
}

function buildCard(eventId: string, solves: Solve[]): EventCardData {
  if (solves.length === 0) {
    return {
      eventId,
      label: getEventLabel(eventId),
      count: 0,
      best: null,
      meanOrAo5: null,
      meanOrAo5Label: "Ao5",
      ao12: null,
    }
  }

  const effective = solves.map(getEffectiveTime)
  const valid = effective.filter((t) => t !== Infinity)
  const best = valid.length > 0 ? Math.min(...valid) : null

  let meanOrAo5: number | null = null
  let meanOrAo5Label = "Ao5"
  if (solves.length >= 5) {
    meanOrAo5 = computeAoN(solves, 5)
  } else if (valid.length > 0) {
    meanOrAo5 = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
    meanOrAo5Label = "Mean"
  }

  const ao12 = solves.length >= 12 ? computeAoN(solves, 12) : null

  return {
    eventId,
    label: getEventLabel(eventId),
    count: solves.length,
    best,
    meanOrAo5,
    meanOrAo5Label,
    ao12,
  }
}

export function SolveAnalyticsEventOverview({
  byEvent,
  rangeLabel,
  onSelectEvent,
}: {
  byEvent: Record<string, Solve[]>
  rangeLabel: string
  onSelectEvent: (eventId: string) => void
}) {
  const cards = useMemo(() => {
    return Object.entries(byEvent)
      .map(([eventId, solves]) => buildCard(eventId, solves))
      .filter((card) => card.count > 0)
      .sort((a, b) => b.count - a.count)
  }, [byEvent])

  if (cards.length === 0) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="flex flex-col items-center gap-2 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No solves in {rangeLabel.toLowerCase()}
          </p>
          <p className="text-xs text-muted-foreground">
            Pick a longer range above, or use the built-in timer to start tracking.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <button
          key={card.eventId}
          type="button"
          onClick={() => onSelectEvent(card.eventId)}
          className="group flex w-full flex-col gap-3 rounded-2xl border border-border/50 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CubingIcon event={card.eventId} className="text-[1.1em]" />
              <span className="truncate text-sm font-semibold text-foreground">
                {card.label}
              </span>
            </div>
            <span className="rounded-full bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {card.count.toLocaleString("en-US")} solve
              {card.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Best
              </p>
              <p className="font-mono text-sm font-bold text-primary">
                {fmt(card.best)}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {card.meanOrAo5Label}
              </p>
              <p className="font-mono text-sm font-bold text-foreground">
                {fmt(card.meanOrAo5)}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Ao12
              </p>
              <p className="font-mono text-sm font-bold text-foreground">
                {fmt(card.ao12)}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/80 group-hover:text-primary">
            View charts →
          </p>
        </button>
      ))}
    </div>
  )
}
