"use client"

import { forwardRef } from "react"
import { Box, Trophy, Timer, User } from "lucide-react"
import { getEventLabel } from "@/lib/constants"
import { formatSolveTime } from "@/lib/utils"
import { formatTimeMs } from "@/lib/timer/averages"

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

export type ShareCardData =
  | PBCardData
  | SessionCardData
  | ProfileCardData
  | SolveCardData

export type AspectRatio = "9:16" | "1:1"

type ShareCardProps = {
  data: ShareCardData
  aspectRatio: AspectRatio
  showScramble?: boolean
}

// ── Dimensions ──────────────────────────────────────────────────────

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 360, height: 640 },
  "1:1": { width: 400, height: 400 },
}

// ── Main Component ──────────────────────────────────────────────────

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  function ShareCard({ data, aspectRatio, showScramble = true }, ref) {
    const { width, height } = DIMENSIONS[aspectRatio]

    return (
      <div
        ref={ref}
        style={{ width, height }}
        className="relative flex flex-col overflow-hidden bg-[#0A0A0F] text-white"
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-6">
          {/* Header */}
          <CardHeader data={data} />

          {/* Body — variant specific */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            {data.variant === "pb" && <PBBody data={data} />}
            {data.variant === "session" && <SessionBody data={data} />}
            {data.variant === "profile" && (
              <ProfileBody data={data} aspectRatio={aspectRatio} />
            )}
            {data.variant === "solve" && (
              <SolveBody data={data} showScramble={showScramble} />
            )}
          </div>

          {/* Footer branding */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Box className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-medium tracking-wide text-zinc-400">
              speedcubehub.com
            </span>
          </div>
        </div>
      </div>
    )
  }
)

// ── Shared Header ───────────────────────────────────────────────────

function CardHeader({ data }: { data: ShareCardData }) {
  return (
    <div className="flex items-center gap-3 pb-3">
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
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{data.userName}</p>
        <p className="truncate text-xs text-zinc-400">@{data.handle}</p>
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

      {/* Stats grid */}
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

      <p className="text-xs text-zinc-500 pt-1">{data.sessionDate}</p>
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
      {/* Large avatar */}
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

      {/* Main events */}
      {data.mainEvents.length > 0 && (
        <div className="flex gap-2 pt-1">
          {data.mainEvents.map((e) => (
            <span
              key={e}
              className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300"
            >
              {getEventLabel(e)}
            </span>
          ))}
        </div>
      )}

      {/* Optional stats row — only if we have data and enough room */}
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
      <p
        className={`text-lg font-bold ${mono ? "font-mono" : ""}`}
      >
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

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
