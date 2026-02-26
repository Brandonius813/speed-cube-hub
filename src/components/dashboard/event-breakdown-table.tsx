"use client"

import type { Session } from "@/lib/types"
import { getEventLabel } from "@/lib/constants"
import { CubingIcon } from "@/components/shared/cubing-icon"
import { formatDuration } from "@/lib/utils"

type EventRow = {
  eventId: string
  label: string
  totalMinutes: number
  solves: number
  pct: number
}

export function EventBreakdownTable({ sessions }: { sessions: Session[] }) {
  if (sessions.length === 0) return null

  const eventMap: Record<string, { minutes: number; solves: number }> = {}
  let totalMinutes = 0

  for (const s of sessions) {
    if (!eventMap[s.event]) {
      eventMap[s.event] = { minutes: 0, solves: 0 }
    }
    eventMap[s.event].minutes += s.duration_minutes
    eventMap[s.event].solves += s.num_solves ?? 0
    totalMinutes += s.duration_minutes
  }

  const rows: EventRow[] = Object.entries(eventMap)
    .map(([eventId, { minutes, solves }]) => ({
      eventId,
      label: getEventLabel(eventId),
      totalMinutes: minutes,
      solves,
      pct: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)

  return (
    <div className="rounded-xl border border-border/50 bg-card">
      <div className="p-4 pb-0 sm:p-6 sm:pb-0">
        <h3 className="text-base font-semibold text-foreground">
          Event Breakdown
        </h3>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30 text-muted-foreground">
              <th className="px-6 py-3 text-left font-medium">Event</th>
              <th className="px-6 py-3 text-right font-medium">Time</th>
              <th className="px-6 py-3 text-right font-medium">Solves</th>
              <th className="px-6 py-3 text-right font-medium">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.eventId} className="border-b border-border/20">
                <td className="px-6 py-3">
                  <span className="flex items-center gap-2">
                    <CubingIcon event={row.eventId} className="text-[0.9em]" />
                    <span className="text-foreground">{row.label}</span>
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-mono text-foreground">
                  {formatDuration(row.totalMinutes)}
                </td>
                <td className="px-6 py-3 text-right font-mono text-foreground">
                  {row.solves.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right font-mono text-foreground">
                  {row.pct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 p-4 sm:hidden">
        {rows.map((row) => (
          <div
            key={row.eventId}
            className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2.5"
          >
            <span className="flex items-center gap-2">
              <CubingIcon event={row.eventId} className="text-[0.85em]" />
              <span className="text-sm text-foreground">{row.label}</span>
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-mono text-foreground">
                {formatDuration(row.totalMinutes)}
              </span>
              <span className="font-mono text-muted-foreground">
                {row.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
