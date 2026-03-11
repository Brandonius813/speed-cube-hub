"use client"

import { forwardRef } from "react"
import { BarChart3, Box, Trophy, Timer, User } from "lucide-react"
import { getEventLabel } from "@/lib/constants"
import { formatTimeMs, formatTimeMsCentiseconds } from "@/lib/timer/averages"
import type { StatWindowSummary } from "@/lib/timer/stat-window-summary"
import { formatSolveTime } from "@/lib/utils"

// ── Variant Data Types ──────────────────────────────────────────────

export type PBCardData = {
  variant: "pb"
  event: string
  pbType: string
  timeSeconds: number
  dateAchieved: string
  userName: string
  handle: string
  avatarUrl: string | null
  previousTimeSeconds?: number
}

export type SessionCardData = {
  variant: "session"
  event: string
  practiceType: string
  numSolves: number | null
  avgTime: number | null
  bestTime: number | null
  durationMinutes: number
  sessionDate: string
  userName: string
  handle: string
  avatarUrl: string | null
}

export type ProfileCardData = {
  variant: "profile"
  userName: string
  handle: string
  avatarUrl: string | null
  bio: string | null
  mainEvents: string[]
  totalSolves?: number
  memberSince?: string
}

export type SolveCardData = {
  variant: "solve"
  event: string
  timeMs: number
  penalty: "+2" | "DNF" | null
  scramble: string
  solveNumber: number
  solvedAt: string
  userName: string
  handle: string
  avatarUrl: string | null
  isPB?: boolean
}

export type AverageCardView = "times" | "distribution"

export type AverageCardData = {
  variant: "average"
  event: string
  summary: StatWindowSummary
  completedAt: string
  userName: string
  handle: string
  avatarUrl: string | null
}

export type ShareCardData =
  | PBCardData
  | SessionCardData
  | ProfileCardData
  | SolveCardData
  | AverageCardData

export type AspectRatio = "9:16" | "1:1"

type ShareCardProps = {
  data: ShareCardData
  aspectRatio: AspectRatio
  showScramble?: boolean
  averageView?: AverageCardView
}

// ── Dimensions ──────────────────────────────────────────────────────

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 360, height: 640 },
  "1:1": { width: 400, height: 400 },
}

// ── Main Component ──────────────────────────────────────────────────

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ data, aspectRatio, showScramble = true, averageView }, ref) {
    const { width, height } = DIMENSIONS[aspectRatio]

    return (
      <div
        ref={ref}
        style={{ width, height }}
        className="relative flex flex-col overflow-hidden bg-[#0A0A0F] text-white"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute bottom-[-6rem] right-[-5rem] h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col p-6">
          <CardHeader data={data} />

          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {data.variant === "pb" && <PBBody data={data} />}
            {data.variant === "session" && <SessionBody data={data} />}
            {data.variant === "profile" && (
              <ProfileBody data={data} aspectRatio={aspectRatio} />
            )}
            {data.variant === "solve" && (
              <SolveBody data={data} showScramble={showScramble} />
            )}
            {data.variant === "average" && (
              <AverageBody
                data={data}
                aspectRatio={aspectRatio}
                view={averageView ?? getDefaultAverageView(data.summary.windowSize)}
              />
            )}
          </div>
        </div>
      </div>
    )
  }
)

// ── Shared Header ───────────────────────────────────────────────────

function CardHeader({ data }: { data: ShareCardData }) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3">
      <div className="flex shrink-0 items-center gap-2">
        <Box className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-medium tracking-wide text-zinc-400">
          speedcubehub.com
        </span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-semibold">{data.userName}</p>
          <p className="truncate text-xs text-zinc-400">@{data.handle}</p>
        </div>
        {data.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.avatarUrl}
            alt={data.userName}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
            <User className="h-5 w-5 text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── PB Variant ──────────────────────────────────────────────────────

function PBBody({ data }: { data: PBCardData }) {
  const eventLabel = getEventLabel(data.event)
  const pbLabel = formatPBType(data.pbType)

  return (
    <>
      <Trophy className="h-8 w-8 text-amber-400" />
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
        New Personal Best
      </p>
      <p className="text-xs text-zinc-400">
        {eventLabel} &middot; {pbLabel}
      </p>
      <p className="font-mono text-5xl font-bold text-white">
        {formatSolveTime(data.timeSeconds)}
      </p>
      {data.previousTimeSeconds !== undefined && (
        <p className="text-xs text-zinc-500">
          Previous: {formatSolveTime(data.previousTimeSeconds)}
        </p>
      )}
      <p className="text-xs text-zinc-500">{data.dateAchieved}</p>
    </>
  )
}

// ── Session Variant ─────────────────────────────────────────────────

function SessionBody({ data }: { data: SessionCardData }) {
  const eventLabel = getEventLabel(data.event)

  return (
    <>
      <Timer className="h-7 w-7 text-indigo-400" />
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
        Practice Session
      </p>
      <p className="text-xs text-zinc-400">
        {eventLabel} &middot; {data.practiceType}
      </p>

      <div className="grid w-full max-w-[260px] grid-cols-2 gap-3 pt-2">
        <StatBox label="Solves" value={String(data.numSolves ?? 0)} />
        <StatBox
          label="Avg"
          value={data.avgTime ? formatSolveTime(data.avgTime) : "–"}
          mono
        />
        <StatBox
          label="Best"
          value={data.bestTime ? formatSolveTime(data.bestTime) : "–"}
          mono
        />
        <StatBox label="Duration" value={formatDuration(data.durationMinutes)} />
      </div>

      <p className="pt-1 text-xs text-zinc-500">{data.sessionDate}</p>
    </>
  )
}

// ── Profile Variant ─────────────────────────────────────────────────

function ProfileBody({
  data,
  aspectRatio,
}: {
  data: ProfileCardData
  aspectRatio: AspectRatio
}) {
  return (
    <>
      {data.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.avatarUrl}
          alt={data.userName}
          className="h-20 w-20 rounded-full object-cover ring-2 ring-indigo-500/50"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 ring-2 ring-indigo-500/50">
          <User className="h-10 w-10 text-zinc-400" />
        </div>
      )}

      <p className="text-lg font-bold">{data.userName}</p>
      <p className="text-sm text-zinc-400">@{data.handle}</p>

      {data.bio && (
        <p className="max-w-[260px] text-center text-xs text-zinc-400 line-clamp-2">
          {data.bio}
        </p>
      )}

      {data.mainEvents.length > 0 && (
        <div className="flex gap-2 pt-1">
          {data.mainEvents.map((eventId) => (
            <span
              key={eventId}
              className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300"
            >
              {getEventLabel(eventId)}
            </span>
          ))}
        </div>
      )}

      {aspectRatio === "9:16" && (data.totalSolves || data.memberSince) && (
        <div className="flex gap-6 pt-2">
          {data.totalSolves !== undefined && (
            <div className="text-center">
              <p className="font-mono text-lg font-bold">
                {data.totalSolves.toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">Solves</p>
            </div>
          )}
          {data.memberSince && (
            <div className="text-center">
              <p className="text-lg font-bold">{data.memberSince}</p>
              <p className="text-xs text-zinc-500">Joined</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Solve Variant ───────────────────────────────────────────────────

function SolveBody({
  data,
  showScramble,
}: {
  data: SolveCardData
  showScramble: boolean
}) {
  const eventLabel = getEventLabel(data.event)
  const displayTime =
    data.penalty === "DNF"
      ? "DNF"
      : data.penalty === "+2"
        ? `${formatTimeMs(data.timeMs)}+`
        : formatTimeMs(data.timeMs)

  return (
    <>
      {data.isPB && <Trophy className="h-6 w-6 text-amber-400" />}
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
        {data.isPB ? "Personal Best!" : `Solve #${data.solveNumber}`}
      </p>
      <p className="text-xs text-zinc-400">{eventLabel}</p>
      <p className="font-mono text-5xl font-bold text-white">{displayTime}</p>

      {showScramble && data.scramble && (
        <p className="max-w-[300px] text-center font-mono text-[10px] leading-tight text-zinc-500">
          {data.scramble}
        </p>
      )}

      <p className="text-xs text-zinc-500">
        {new Date(data.solvedAt).toLocaleDateString()}
      </p>
    </>
  )
}

// ── Average Variant ─────────────────────────────────────────────────

function AverageBody({
  data,
  aspectRatio,
  view,
}: {
  data: AverageCardData
  aspectRatio: AspectRatio
  view: AverageCardView
}) {
  const eventLabel = getEventLabel(data.event)
  const completedDate = new Date(data.completedAt).toLocaleDateString()

  return (
    <div className="flex h-full w-full flex-col justify-center gap-3">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-400">
          {formatAverageLabel(data.summary.label)}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          {eventLabel} &middot; {data.summary.windowSize} solves
        </p>
        <p className="mt-2 font-mono text-5xl font-bold leading-none text-white">
          {data.summary.displayValue}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-400">
          {data.summary.sigmaMs !== null && (
            <span className="font-mono">σ {formatTimeMsCentiseconds(data.summary.sigmaMs)}</span>
          )}
          {data.summary.plus2Count > 0 && (
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 font-mono text-yellow-200">
              +2 {data.summary.plus2Count}
            </span>
          )}
          {data.summary.dnfCount > 0 && (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 font-mono text-red-200">
              DNF {data.summary.dnfCount}
            </span>
          )}
        </div>
      </div>

      {view === "distribution" ? (
        <AverageDistribution data={data} aspectRatio={aspectRatio} />
      ) : (
        <AverageTimesGrid data={data} aspectRatio={aspectRatio} />
      )}

      <p className="pt-1 text-center text-xs text-zinc-500">{completedDate}</p>
    </div>
  )
}

function AverageTimesGrid({
  data,
  aspectRatio,
}: {
  data: AverageCardData
  aspectRatio: AspectRatio
}) {
  const { summary } = data
  const columns = getTimesGridColumns(summary.windowSize, aspectRatio)
  const fontClass =
    summary.windowSize >= 20
      ? "text-[9px]"
      : summary.windowSize >= 12
        ? "text-[10px]"
        : "text-[11px]"

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          Times
        </span>
        {!summary.isMean && !summary.isSingle && (
          <span className="text-[10px] text-zinc-500">Trimmed solves dimmed</span>
        )}
      </div>

      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {summary.solves.map((solve, index) => (
          <div
            key={solve.id}
            className={
              "rounded-lg border px-2 py-1.5 " +
              (solve.isTrimmed
                ? "border-zinc-700/60 bg-zinc-900/40 text-zinc-500"
                : "border-white/10 bg-zinc-900/70 text-white")
            }
          >
            <p className="font-mono text-[9px] tabular-nums text-zinc-500">
              {index + 1}
            </p>
            <p className={`mt-0.5 font-mono font-semibold tabular-nums ${fontClass}`}>
              {solve.isTrimmed ? `(${formatCompactTime(solve)})` : formatCompactTime(solve)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AverageDistribution({
  data,
  aspectRatio,
}: {
  data: AverageCardData
  aspectRatio: AspectRatio
}) {
  const { summary } = data
  const maxCount = Math.max(...summary.bins.map((bin) => bin.count), 1)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <StatBox
          label="Best"
          value={summary.bestMs === null ? "—" : formatTimeMsCentiseconds(summary.bestMs)}
          mono
        />
        <StatBox
          label="Worst"
          value={summary.worstMs === null ? "—" : formatTimeMsCentiseconds(summary.worstMs)}
          mono
        />
        <StatBox
          label="Included"
          value={String(summary.windowSize - summary.dnfCount)}
        />
        <StatBox
          label="Trimmed"
          value={summary.isMean ? "0" : String(summary.trimmedIndices.length)}
        />
      </div>

      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        <BarChart3 className="h-3.5 w-3.5" />
        Distribution
      </div>

      <div className="space-y-1.5">
        {summary.bins.map((bin) => (
          <div key={`${bin.startMs}-${bin.endMs}`} className="grid grid-cols-[4.75rem_minmax(0,1fr)_2rem] items-center gap-2">
            <span
              className={
                "truncate font-mono " +
                (aspectRatio === "9:16" ? "text-[9px]" : "text-[10px]") +
                " text-zinc-400"
              }
            >
              {bin.label}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-cyan-400"
                style={{ width: `${Math.max(8, (bin.count / maxCount) * 100)}%` }}
              />
            </div>
            <span className="text-right font-mono text-[10px] text-zinc-400">
              {bin.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="rounded-lg bg-zinc-900/80 px-3 py-2 text-center">
      <p className={`text-lg font-bold ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  )
}

function formatPBType(pbType: string): string {
  if (pbType === "single" || pbType === "Single") return "Single"
  const upper = pbType.toUpperCase()
  if (upper.startsWith("AO") || upper.startsWith("MO")) return upper
  return pbType
}

function formatAverageLabel(label: string): string {
  if (label === "single") return "Single"
  return label.toUpperCase()
}

function formatCompactTime(
  solve: StatWindowSummary["solves"][number]
): string {
  if (solve.effectiveMs === null) return "DNF"
  return solve.penalty === "+2"
    ? `${formatTimeMsCentiseconds(solve.effectiveMs)}+`
    : formatTimeMsCentiseconds(solve.effectiveMs)
}

function getDefaultAverageView(windowSize: number): AverageCardView {
  return windowSize >= 25 ? "distribution" : "times"
}

function getTimesGridColumns(windowSize: number, aspectRatio: AspectRatio): number {
  if (windowSize <= 5) return 1
  if (windowSize <= 12) return 2
  if (windowSize <= 20) return aspectRatio === "9:16" ? 2 : 3
  return 5
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
