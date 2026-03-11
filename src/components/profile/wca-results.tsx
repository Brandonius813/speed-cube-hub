"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ExternalLink,
  Medal,
} from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import type { WcaPersonalRecords, WcaRecord } from "@/lib/actions/wca"
import {
  formatEventTime,
  truncateSecondsToCentiseconds,
} from "@/lib/utils"

/** Legacy/retired WCA events that can still appear in profiles */
const LEGACY_EVENT_LABELS: Record<string, string> = {
  "333ft": "Feet",
  magic: "Magic",
  mmagic: "Master Magic",
  "333mbo": "Multi-BLD (Old)",
}

type RankType = "world" | "national" | "continental"

const RANK_LABEL: Record<RankType, string> = {
  world: "WR",
  national: "NR",
  continental: "CR",
}

function getEventLabel(eventId: string): string {
  const wcaEvent = WCA_EVENTS.find((e) => e.id === eventId)
  if (wcaEvent) return wcaEvent.label
  return LEGACY_EVENT_LABELS[eventId] ?? eventId
}

function formatWcaTime(
  value: number,
  eventId: string,
  type: "single" | "average"
): string {
  // FMC: single = moves (integer), average = centimoves (e.g. 2733 = 27.33)
  if (eventId === "333fm") {
    if (type === "single") return `${value}`
    return `${truncateSecondsToCentiseconds(value / 100)}`
  }
  // MBLD: special encoding
  if (eventId === "333mbf" || eventId === "333mbo") {
    return formatMbld(value, eventId)
  }
  return formatEventTime(value / 100, eventId)
}

function formatMbld(value: number, eventId: string): string {
  if (eventId === "333mbo") {
    // Old format: 1SSAATTTTT
    const solved = Math.floor(value / 10000000) % 100
    const attempted = Math.floor(value / 100000) % 100
    const timeSeconds = value % 100000
    return `${solved}/${attempted} in ${formatMbldTime(timeSeconds)}`
  }
  // New format: 0DDTTTTTMM
  const dd = Math.floor(value / 10000000)
  const ttttt = Math.floor(value / 100) % 100000
  const mm = value % 100
  const difference = 99 - dd
  const solved = difference + mm
  const attempted = solved + mm
  if (ttttt === 99999) {
    return `${solved}/${attempted}`
  }
  return `${solved}/${attempted} in ${formatMbldTime(ttttt)}`
}

function formatMbldTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function getRankValue(
  record: WcaRecord | undefined,
  rankType: RankType
): number | null {
  if (!record) return null
  switch (rankType) {
    case "world":
      return record.world_rank
    case "national":
      return record.country_rank
    case "continental":
      return record.continent_rank
  }
}

/** Sort events by official WCA order */
function sortByWcaOrder(events: ProcessedEvent[]): ProcessedEvent[] {
  return [...events].sort((a, b) => {
    const aIdx = WCA_EVENTS.findIndex((e) => e.id === a.eventId)
    const bIdx = WCA_EVENTS.findIndex((e) => e.id === b.eventId)
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
  })
}

type SortMode = "default" | "rank"

type ProcessedEvent = {
  eventId: string
  label: string
  single?: WcaRecord
  average?: WcaRecord
}

export function WcaResults({
  personalRecords,
  competitionCount,
  wcaId,
  mainEvents = [],
}: {
  personalRecords: WcaPersonalRecords
  competitionCount: number
  wcaId?: string | null
  mainEvents?: string[]
}) {
  const [sortBy, setSortBy] = useState<SortMode>("default")
  const [sortField, setSortField] = useState<"single" | "average">("single")
  const [rankType, setRankType] = useState<RankType>("world")

  const events: ProcessedEvent[] = Object.entries(personalRecords).map(
    ([eventId, records]) => ({
      eventId,
      label: getEventLabel(eventId),
      single: records.single,
      average: records.average,
    })
  )

  const sortedEvents = (() => {
    if (sortBy === "rank") {
      return [...events].sort((a, b) => {
        const aRank = getRankValue(a[sortField], rankType) ?? 999999
        const bRank = getRankValue(b[sortField], rankType) ?? 999999
        return aRank - bRank
      })
    }
    // Default: official WCA order
    return sortByWcaOrder(events)
  })()

  const mainEventSet = new Set(mainEvents)

  if (events.length === 0) return null

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Medal className="h-5 w-5 text-accent" />
            Official WCA Results
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {competitionCount} comp{competitionCount !== 1 ? "s" : ""}
            </span>
            {wcaId && (
              <a
                href={`https://www.worldcubeassociation.org/persons/${wcaId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-1.5 rounded-md border border-border/50 bg-secondary/50 px-3 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                WCA Profile
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Controls: Sort + Rank type */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort:</span>
            <SegmentedToggle
              options={[
                { value: "default", label: "Default" },
                { value: "rank", label: "Rank" },
              ]}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortMode)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rank:</span>
            <SegmentedToggle
              options={[
                { value: "world", label: "WR" },
                { value: "continental", label: "CR" },
                { value: "national", label: "NR" },
              ]}
              value={rankType}
              onChange={(v) => setRankType(v as RankType)}
            />
          </div>
          {sortBy === "rank" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">By:</span>
              <SegmentedToggle
                options={[
                  { value: "single", label: "Single" },
                  { value: "average", label: "Avg" },
                ]}
                value={sortField}
                onChange={(v) => setSortField(v as "single" | "average")}
              />
            </div>
          )}
        </div>

        {/* Event grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {sortedEvents.map((event) => (
            <EventCard
              key={event.eventId}
              event={event}
              rankType={rankType}
              isMainEvent={mainEventSet.has(event.eventId)}
            />
          ))}
        </div>

      </CardContent>
    </Card>
  )
}

/** Reusable segmented toggle (pill-style switcher) */
function SegmentedToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex rounded-full bg-muted/50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Single event card showing times + rank */
function EventCard({
  event,
  rankType,
  isMainEvent = false,
}: {
  event: ProcessedEvent
  rankType: RankType
  isMainEvent?: boolean
}) {
  const singleRank = getRankValue(event.single, rankType)
  const avgRank = getRankValue(event.average, rankType)
  const label = RANK_LABEL[rankType]

  return (
    <div className={`flex items-center justify-between rounded-lg border p-4 ${
      isMainEvent
        ? "border-primary/40 bg-primary/5"
        : "border-border/50 bg-secondary/50"
    }`}>
      <div className="flex items-center gap-3">
        <CubingIcon
          event={event.eventId}
          className={`shrink-0 text-base ${isMainEvent ? "text-primary" : "text-muted-foreground"}`}
        />
        <span className="font-medium text-foreground">{event.label}</span>
        {isMainEvent && (
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
            Main
          </span>
        )}
      </div>
      <div className="flex gap-6 text-right">
        {event.single && (
          <div>
            <p className="text-xs text-muted-foreground">Single</p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {formatWcaTime(event.single.best, event.eventId, "single")}
            </p>
            {singleRank != null && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {label} #{singleRank.toLocaleString()}
              </p>
            )}
          </div>
        )}
        {event.average && (
          <div>
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {formatWcaTime(event.average.best, event.eventId, "average")}
            </p>
            {avgRank != null && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {label} #{avgRank.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
