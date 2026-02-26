"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ExternalLink,
  Medal,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
} from "lucide-react"
import { WCA_EVENTS } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { updateWcaEventOrder } from "@/lib/actions/profiles"
import type { WcaPersonalRecords, WcaRecord } from "@/lib/actions/wca"

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
    const mean = parseFloat((value / 100).toFixed(2))
    return `${mean}`
  }
  // MBLD: special encoding
  if (eventId === "333mbf" || eventId === "333mbo") {
    return formatMbld(value, eventId)
  }
  const seconds = value / 100
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
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

/** Sort events using saved custom order, falling back to default WCA order */
function sortByCustomOrder(
  events: ProcessedEvent[],
  customOrder: string[]
): ProcessedEvent[] {
  return [...events].sort((a, b) => {
    if (customOrder.length > 0) {
      const aIdx = customOrder.indexOf(a.eventId)
      const bIdx = customOrder.indexOf(b.eventId)
      const aPos =
        aIdx !== -1
          ? aIdx
          : 1000 + (WCA_EVENTS.findIndex((e) => e.id === a.eventId) ?? 999)
      const bPos =
        bIdx !== -1
          ? bIdx
          : 1000 + (WCA_EVENTS.findIndex((e) => e.id === b.eventId) ?? 999)
      return aPos - bPos
    }
    // Default WCA order
    const aIdx = WCA_EVENTS.findIndex((e) => e.id === a.eventId)
    const bIdx = WCA_EVENTS.findIndex((e) => e.id === b.eventId)
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
  })
}

type SortMode = "default" | "rank" | "time"

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
  isOwner = false,
  customEventOrder,
  mainEvents = [],
}: {
  personalRecords: WcaPersonalRecords
  competitionCount: number
  wcaId?: string | null
  isOwner?: boolean
  customEventOrder?: string[] | null
  mainEvents?: string[]
}) {
  const [editing, setEditing] = useState(false)
  const [sortBy, setSortBy] = useState<SortMode>("default")
  const [sortField, setSortField] = useState<"single" | "average">("single")
  const [rankType, setRankType] = useState<RankType>("world")
  const [customOrder, setCustomOrder] = useState<string[]>(
    customEventOrder ?? []
  )

  const events: ProcessedEvent[] = Object.entries(personalRecords).map(
    ([eventId, records]) => ({
      eventId,
      label: getEventLabel(eventId),
      single: records.single,
      average: records.average,
    })
  )

  // "Default" uses the custom order (if set), rank/time override it
  const sortedEvents = (() => {
    if (sortBy === "rank") {
      return [...events].sort((a, b) => {
        const aRank = getRankValue(a[sortField], rankType) ?? 999999
        const bRank = getRankValue(b[sortField], rankType) ?? 999999
        return aRank - bRank
      })
    }
    if (sortBy === "time") {
      return [...events].sort((a, b) => {
        const aTime = a[sortField]?.best ?? 999999
        const bTime = b[sortField]?.best ?? 999999
        return aTime - bTime
      })
    }
    // Default: use custom order (or WCA order if no custom order saved)
    return sortByCustomOrder(events, customOrder)
  })()

  const visibleEvents = sortedEvents
  const mainEventSet = new Set(mainEvents)

  async function handleMove(eventId: string, direction: "up" | "down") {
    // Build the current order from sortedEvents if no custom order yet
    const currentOrder =
      customOrder.length > 0
        ? [...customOrder]
        : sortedEvents.map((e) => e.eventId)

    const idx = currentOrder.indexOf(eventId)
    if (idx === -1) return

    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= currentOrder.length) return

    ;[currentOrder[idx], currentOrder[swapIdx]] = [
      currentOrder[swapIdx],
      currentOrder[idx],
    ]

    // Optimistically update
    setCustomOrder(currentOrder)

    const result = await updateWcaEventOrder(currentOrder)
    if (!result.success) {
      // Revert on failure
      setCustomOrder(customOrder)
    }
  }

  function startEditing() {
    // Initialize custom order from current display order if not set yet
    if (customOrder.length === 0) {
      const baseOrder = sortByCustomOrder(events, [])
      const initialOrder = baseOrder.map((e) => e.eventId)
      setCustomOrder(initialOrder)
      updateWcaEventOrder(initialOrder)
    }
    // Switch to default sort so the user sees their custom order
    setSortBy("default")
    setEditing(true)
  }

  function stopEditing() {
    setEditing(false)
  }

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
            {isOwner && !editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={startEditing}
                className="min-h-9 gap-1.5 border-border/50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Order
              </Button>
            )}
            {isOwner && editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={stopEditing}
                className="min-h-9 gap-1.5 border-border/50"
              >
                <Check className="h-3.5 w-3.5" />
                Done
              </Button>
            )}
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
        {!editing && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort:</span>
              <SegmentedToggle
                options={[
                  { value: "default", label: "Default" },
                  { value: "rank", label: "Rank" },
                  { value: "time", label: "Time" },
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
            {(sortBy === "rank" || sortBy === "time") && (
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
        )}

        {editing && (
          <p className="mb-4 text-xs text-muted-foreground">
            Use the arrows to reorder your events.
          </p>
        )}

        {/* Event grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleEvents.map((event) => (
            <EventCard
              key={event.eventId}
              event={event}
              rankType={rankType}
              showReorder={editing}
              isFirst={sortedEvents[0]?.eventId === event.eventId}
              isLast={
                sortedEvents[sortedEvents.length - 1]?.eventId ===
                event.eventId
              }
              onMove={(dir) => handleMove(event.eventId, dir)}
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
  showReorder = false,
  isFirst = false,
  isLast = false,
  onMove,
  isMainEvent = false,
}: {
  event: ProcessedEvent
  rankType: RankType
  showReorder?: boolean
  isFirst?: boolean
  isLast?: boolean
  onMove?: (direction: "up" | "down") => void
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
        {showReorder && (
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMove?.("up")}
              disabled={isFirst}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
              aria-label="Move event up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => onMove?.("down")}
              disabled={isLast}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
              aria-label="Move event down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        )}
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
      {!showReorder && (
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
      )}
    </div>
  )
}
