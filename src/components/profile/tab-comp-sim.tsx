"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatSolveTime } from "@/lib/utils"
import {
  COMP_SIM_FORMAT_LABELS,
  getCompSimEndedReasonLabel,
  getCompSimSceneLabel,
} from "@/lib/timer/comp-sim-round"
import type { Session } from "@/lib/types"

type TrendPoint = {
  index: number
  date: string
  result: number
  label: string
}

export function TabCompSim({ sessions }: { sessions: Session[] }) {
  const [eventFilter, setEventFilter] = useState("all")
  const [formatFilter, setFormatFilter] = useState("all")
  const [endedFilter, setEndedFilter] = useState("all")

  const compSimSessions = useMemo(
    () =>
      sessions
        .filter((session) => session.practice_type === "Comp Sim")
        .sort((a, b) => {
          const aTime = new Date(a.created_at).getTime()
          const bTime = new Date(b.created_at).getTime()
          return bTime - aTime
        }),
    [sessions]
  )

  const eventOptions = useMemo(
    () => Array.from(new Set(compSimSessions.map((session) => session.event))).sort(),
    [compSimSessions]
  )
  const formatOptions = useMemo(
    () =>
      Array.from(
        new Set(
          compSimSessions
            .map((session) => session.comp_sim_format)
            .filter((value): value is NonNullable<Session["comp_sim_format"]> => value != null)
        )
      ),
    [compSimSessions]
  )
  const endedOptions = useMemo(
    () =>
      Array.from(
        new Set(
          compSimSessions
            .map((session) => session.comp_sim_ended_reason)
            .filter((value): value is NonNullable<Session["comp_sim_ended_reason"]> => value != null)
        )
      ),
    [compSimSessions]
  )

  const filtered = useMemo(() => {
    return compSimSessions.filter((session) => {
      if (eventFilter !== "all" && session.event !== eventFilter) return false
      if (formatFilter !== "all" && session.comp_sim_format !== formatFilter) return false
      if (endedFilter !== "all" && session.comp_sim_ended_reason !== endedFilter) return false
      return true
    })
  }, [compSimSessions, endedFilter, eventFilter, formatFilter])

  const validResults = useMemo(
    () =>
      filtered.filter(
        (session) => session.comp_sim_result_seconds != null
      ) as Array<Session & { comp_sim_result_seconds: number }>,
    [filtered]
  )

  const stats = useMemo(() => {
    const best = validResults.length > 0
      ? Math.min(...validResults.map((session) => session.comp_sim_result_seconds))
      : null
    const recentWindow = validResults.slice(0, 5)
    const recentAverage =
      recentWindow.length > 0
        ? recentWindow.reduce((sum, session) => sum + session.comp_sim_result_seconds, 0) /
          recentWindow.length
        : null
    const cutoffSessions = filtered.filter((session) => session.comp_sim_cutoff_attempt != null)
    const cutoffSuccessRate =
      cutoffSessions.length > 0
        ? cutoffSessions.filter((session) => session.comp_sim_cutoff_met).length /
          cutoffSessions.length
        : null
    const timeLimitFailureRate =
      filtered.length > 0
        ? filtered.filter((session) => session.comp_sim_ended_reason === "time_limit_reached").length /
          filtered.length
        : null
    const dnfRate =
      filtered.length > 0
        ? filtered.filter(
            (session) =>
              session.comp_sim_ended_reason === "completed" &&
              session.comp_sim_result_seconds == null
          ).length / filtered.length
        : null

    return {
      best,
      recentAverage,
      attempts: filtered.length,
      cutoffSuccessRate,
      timeLimitFailureRate,
      dnfRate,
    }
  }, [filtered, validResults])

  const trendData = useMemo<TrendPoint[]>(() => {
    return [...validResults]
      .reverse()
      .map((session, index) => ({
        index: index + 1,
        date: session.session_date,
        result: session.comp_sim_result_seconds,
        label: session.title ?? `Attempt ${index + 1}`,
      }))
  }, [validResults])

  const comparison = useMemo(() => {
    const targetEvent = eventFilter !== "all" ? eventFilter : filtered[0]?.event ?? null
    if (!targetEvent) {
      return { event: null, comp: null, practice: null }
    }

    const compWindow = compSimSessions
      .filter(
        (session) =>
          session.event === targetEvent && session.comp_sim_result_seconds != null
      )
      .slice(0, 5) as Array<Session & { comp_sim_result_seconds: number }>
    const practiceWindow = sessions
      .filter(
        (session) =>
          session.practice_type === "Solves" &&
          session.event === targetEvent &&
          session.avg_time != null
      )
      .slice(0, 5) as Array<Session & { avg_time: number }>

    return {
      event: targetEvent,
      comp:
        compWindow.length > 0
          ? compWindow.reduce((sum, session) => sum + session.comp_sim_result_seconds, 0) /
            compWindow.length
          : null,
      practice:
        practiceWindow.length > 0
          ? practiceWindow.reduce((sum, session) => sum + session.avg_time, 0) / practiceWindow.length
          : null,
    }
  }, [compSimSessions, eventFilter, filtered, sessions])

  if (compSimSessions.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        No Competition Simulator rounds saved yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/90 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Dedicated Comp Sim Tracking
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground">
              Round pressure, separate from normal sessions
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Filter by event, format, and ending reason to review how simulated rounds are trending over time.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <FilterSelect label="Event" value={eventFilter} onChange={setEventFilter}>
              <option value="all">All events</option>
              {eventOptions.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Format" value={formatFilter} onChange={setFormatFilter}>
              <option value="all">All formats</option>
              {formatOptions.map((format) => (
                <option key={format} value={format}>
                  {COMP_SIM_FORMAT_LABELS[format]}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Ended" value={endedFilter} onChange={setEndedFilter}>
              <option value="all">All outcomes</option>
              {endedOptions.map((ended) => (
                <option key={ended} value={ended}>
                  {getCompSimEndedReasonLabel(ended)}
                </option>
              ))}
            </FilterSelect>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Best Result" value={stats.best != null ? formatSolveTime(stats.best) : "—"} />
        <KpiCard label="Recent Avg" value={stats.recentAverage != null ? formatSolveTime(stats.recentAverage) : "—"} />
        <KpiCard label="Attempts" value={String(stats.attempts)} />
        <KpiCard
          label="Cutoff Success"
          value={stats.cutoffSuccessRate != null ? `${Math.round(stats.cutoffSuccessRate * 100)}%` : "—"}
        />
        <KpiCard
          label="Time Limit Fail"
          value={stats.timeLimitFailureRate != null ? `${Math.round(stats.timeLimitFailureRate * 100)}%` : "—"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="rounded-3xl border border-border/60 bg-card/90 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Trend
          </p>
          {trendData.length >= 2 ? (
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#253041" vertical={false} />
                  <XAxis dataKey="index" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => formatSolveTime(value)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const point = payload[0].payload as TrendPoint
                      return (
                        <div className="rounded-xl border border-border/70 bg-background px-3 py-2 text-xs shadow-xl">
                          <p className="font-semibold text-foreground">{point.label}</p>
                          <p className="mt-1 text-muted-foreground">
                            Result: <span className="font-mono text-foreground">{formatSolveTime(point.result)}</span>
                          </p>
                          <p className="text-muted-foreground">{point.date}</p>
                        </div>
                      )
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="result"
                    stroke="#22d3ee"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#22d3ee" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Save at least 2 numeric Comp Sim results to see a trend line.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border/60 bg-card/90 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Comparison
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {comparison.event ? `${comparison.event} comp sim vs normal practice` : "No event selected"}
          </h3>
          <div className="mt-4 space-y-3">
            <ComparisonCard
              label="Recent Comp Sim"
              value={comparison.comp != null ? formatSolveTime(comparison.comp) : "—"}
            />
            <ComparisonCard
              label="Recent Solves Sessions"
              value={comparison.practice != null ? formatSolveTime(comparison.practice) : "—"}
            />
            <ComparisonCard
              label="Completed DNF Rate"
              value={stats.dnfRate != null ? `${Math.round(stats.dnfRate * 100)}%` : "—"}
            />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-card/90 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Attempt History
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">
              Separate from normal session history
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">{filtered.length} round{filtered.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-border/60 bg-background/70 px-4 py-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                      {session.comp_sim_format ? COMP_SIM_FORMAT_LABELS[session.comp_sim_format] : "Legacy Ao5"}
                    </span>
                    <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {getCompSimEndedReasonLabel(session.comp_sim_ended_reason ?? "completed")}
                    </span>
                    <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
                      {session.event}
                    </span>
                  </div>
                  <h4 className="mt-2 text-base font-semibold text-foreground">
                    {session.title ?? "Comp Sim Attempt"}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {session.session_date}
                    {session.comp_sim_scene ? ` • ${getCompSimSceneLabel(session.comp_sim_scene)}` : ""}
                    {session.comp_sim_intensity != null ? ` • ${session.comp_sim_intensity}% intensity` : ""}
                  </p>
                </div>

                <div className="text-left lg:text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Result
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {session.comp_sim_result_seconds != null
                      ? formatSolveTime(session.comp_sim_result_seconds)
                      : session.comp_sim_ended_reason === "completed"
                        ? "DNF"
                        : "No Result"}
                  </p>
                </div>
              </div>

              {(session.comp_sim_time_limit_seconds != null ||
                session.comp_sim_cutoff_attempt != null) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {session.comp_sim_time_limit_seconds != null && (
                    <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">
                      Time limit {formatSolveTime(session.comp_sim_time_limit_seconds)}
                    </span>
                  )}
                  {session.comp_sim_cutoff_attempt != null &&
                    session.comp_sim_cutoff_seconds != null && (
                      <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-fuchsia-100">
                        Cutoff after solve {session.comp_sim_cutoff_attempt}: {formatSolveTime(session.comp_sim_cutoff_seconds)}
                      </span>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none"
      >
        {children}
      </select>
    </label>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function ComparisonCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}
