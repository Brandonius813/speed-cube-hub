"use client"

import type { SessionSummary, NormalizedPB } from "@/lib/import/types"
import { getEventLabel } from "@/lib/constants"

type SessionPreviewProps = {
  sessions: SessionSummary[]
  totalSolves: number
  source: string
}

export function SessionPreview({ sessions, totalSolves, source }: SessionPreviewProps) {
  const totalDnf = sessions.reduce((sum, s) => sum + s.num_dnf, 0)
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          {source} \u2014 {sessions.length} session{sessions.length !== 1 ? "s" : ""},{" "}
          {totalSolves} solve{totalSolves !== 1 ? "s" : ""}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalDnf} DNF{totalDnf !== 1 ? "s" : ""} \u00b7 ~{totalMinutes} min total
        </p>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {sessions.map((s) => (
          <div key={s.session_date} className="rounded-lg border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{s.session_date}</span>
              <span className="text-xs text-muted-foreground">{s.num_solves} solve{s.num_solves !== 1 ? "s" : ""}</span>
            </div>
            <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
              <span>Avg: {s.avg_time ? `${s.avg_time}s` : "\u2013"}</span>
              <span>Best: {s.best_time ? `${s.best_time}s` : "\u2013"}</span>
              <span>~{s.duration_minutes} min</span>
              {s.num_dnf > 0 && <span className="text-red-400">{s.num_dnf} DNF</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4">Date</th>
              <th className="pb-2 pr-4 text-right">Solves</th>
              <th className="pb-2 pr-4 text-right">DNFs</th>
              <th className="pb-2 pr-4 text-right font-mono">Avg</th>
              <th className="pb-2 pr-4 text-right font-mono">Best</th>
              <th className="pb-2 text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.session_date} className="border-b border-border/30 text-foreground">
                <td className="py-2 pr-4">{s.session_date}</td>
                <td className="py-2 pr-4 text-right font-mono">{s.num_solves}</td>
                <td className="py-2 pr-4 text-right font-mono">{s.num_dnf || "\u2013"}</td>
                <td className="py-2 pr-4 text-right font-mono">{s.avg_time ? `${s.avg_time}s` : "\u2013"}</td>
                <td className="py-2 pr-4 text-right font-mono">{s.best_time ? `${s.best_time}s` : "\u2013"}</td>
                <td className="py-2 text-right">{s.duration_minutes} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

type PBPreviewProps = { pbs: NormalizedPB[] }

export function PBPreview({ pbs }: PBPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          {pbs.length} personal best{pbs.length !== 1 ? "s" : ""} detected
        </p>
      </div>

      <div className="space-y-2 sm:hidden">
        {pbs.map((pb, i) => (
          <div key={i} className="rounded-lg border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {getEventLabel(pb.event)} \u2014 {pb.pb_type}
              </span>
              <span className="font-mono text-sm text-foreground">{pb.time_seconds}s</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pb.date_achieved}</p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4">Event</th>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4 text-right font-mono">Time</th>
              <th className="pb-2 text-right">Date</th>
            </tr>
          </thead>
          <tbody>
            {pbs.map((pb, i) => (
              <tr key={i} className="border-b border-border/30 text-foreground">
                <td className="py-2 pr-4">{getEventLabel(pb.event)}</td>
                <td className="py-2 pr-4">{pb.pb_type}</td>
                <td className="py-2 pr-4 text-right font-mono">{pb.time_seconds}s</td>
                <td className="py-2 text-right">{pb.date_achieved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
