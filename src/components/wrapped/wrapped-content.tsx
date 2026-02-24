"use client"

import { useState, useTransition } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WCA_EVENTS } from "@/lib/constants"
import { getWrappedStats } from "@/lib/actions/wrapped"
import type { WrappedStats } from "@/lib/types"
import {
  Trophy,
  Flame,
  Clock,
  Target,
  TrendingDown,
  Calendar,
  Loader2,
} from "lucide-react"

function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label || eventId
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-medium text-foreground">{label}</p>
        <p className="font-mono text-primary">
          {payload[0].value.toLocaleString()} solves
        </p>
      </div>
    )
  }
  return null
}

// Generate year options from 2024 to current year
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = currentYear; y >= 2024; y--) {
    years.push(y)
  }
  return years
}

type Props = {
  initialStats: WrappedStats | null
  initialYear: number
}

export function WrappedContent({ initialStats, initialYear }: Props) {
  const [stats, setStats] = useState(initialStats)
  const [year, setYear] = useState(initialYear)
  const [isPending, startTransition] = useTransition()

  function handleYearChange(newYear: string) {
    const y = parseInt(newYear, 10)
    setYear(y)
    startTransition(async () => {
      const result = await getWrappedStats(y)
      setStats(result)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with year selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Year in Review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your cubing highlights for {year}
          </p>
        </div>
        <Select value={String(year)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getYearOptions().map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {isPending && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* No data state */}
      {!isPending && !stats && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold text-foreground">
              No sessions in {year}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Log some practice sessions to see your Year in Review stats here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats content */}
      {!isPending && stats && (
        <div className="space-y-6">
          <HeroSection stats={stats} />
          <KeyStatsGrid stats={stats} />
          <MostPracticedSection stats={stats} />
          <PBImprovementSection stats={stats} />
          <TopEventsSection stats={stats} />
          <MonthlyChartSection stats={stats} />
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hero: total solves in giant text                                    */
/* ------------------------------------------------------------------ */

function HeroSection({ stats }: { stats: WrappedStats }) {
  return (
    <Card className="overflow-hidden border-primary/30">
      <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 py-10 text-center sm:py-14">
        <p className="text-sm font-medium tracking-widest text-primary uppercase">
          {stats.year} Total
        </p>
        <p className="mt-3 font-mono text-5xl font-bold text-foreground sm:text-7xl">
          {stats.totalSolves.toLocaleString()}
        </p>
        <p className="mt-2 text-lg text-muted-foreground">
          solves logged in {stats.year}
        </p>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Key stats: 2x2 mobile, 4-col desktop                               */
/* ------------------------------------------------------------------ */

function KeyStatsGrid({ stats }: { stats: WrappedStats }) {
  const items = [
    {
      label: "Practice Hours",
      value: `${stats.totalHours}`,
      unit: "hours",
      icon: Clock,
    },
    {
      label: "Sessions",
      value: `${stats.totalSessions}`,
      unit: "",
      icon: Target,
    },
    {
      label: "Longest Streak",
      value: `${stats.longestStreak}`,
      unit: "days",
      icon: Flame,
    },
    {
      label: "Events Practiced",
      value: `${stats.eventsPracticed}`,
      unit: "/ 17",
      icon: Trophy,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="border-border/50">
          <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <item.icon className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium sm:text-sm">
                {item.label}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
                {item.value}
              </span>
              {item.unit && (
                <span className="text-sm text-muted-foreground">
                  {item.unit}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Most practiced event                                                */
/* ------------------------------------------------------------------ */

function MostPracticedSection({ stats }: { stats: WrappedStats }) {
  if (!stats.mostPracticedEvent) return null

  const eventLabel = getEventLabel(stats.mostPracticedEvent)
  const topEvent = stats.topEvents.find(
    (e) => e.event === stats.mostPracticedEvent
  )
  const solves = topEvent?.solves ?? 0

  return (
    <Card className="border-primary/30">
      <CardContent className="px-6 py-6 sm:py-8">
        <p className="text-xs font-medium tracking-widest text-primary uppercase">
          Most Practiced Event
        </p>
        <p className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          {eventLabel}
        </p>
        <p className="mt-1 text-muted-foreground">
          <span className="font-mono font-semibold text-foreground">
            {solves.toLocaleString()}
          </span>{" "}
          solves logged
        </p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Biggest PB improvement                                              */
/* ------------------------------------------------------------------ */

function PBImprovementSection({ stats }: { stats: WrappedStats }) {
  if (!stats.biggestPBImprovement) return null

  const eventLabel = getEventLabel(stats.biggestPBImprovement.event)

  return (
    <Card className="border-border/50">
      <CardContent className="px-6 py-6 sm:py-8">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-green-400" />
          <p className="text-xs font-medium tracking-widest text-green-400 uppercase">
            Biggest PB Improvement
          </p>
        </div>
        <p className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
          -{stats.biggestPBImprovement.improvement}s
        </p>
        <p className="mt-1 text-muted-foreground">on {eventLabel}</p>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Top events ranked list                                              */
/* ------------------------------------------------------------------ */

function TopEventsSection({ stats }: { stats: WrappedStats }) {
  if (stats.topEvents.length === 0) return null

  const maxSolves = stats.topEvents[0]?.solves ?? 1

  return (
    <Card className="border-border/50">
      <CardContent className="px-6 py-6">
        <p className="mb-4 text-xs font-medium tracking-widest text-primary uppercase">
          Top Events by Solves
        </p>
        <div className="space-y-3">
          {stats.topEvents.map((entry, i) => {
            const pct = Math.max((entry.solves / maxSolves) * 100, 4)
            return (
              <div key={entry.event}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    <span className="mr-2 text-muted-foreground">
                      {i + 1}.
                    </span>
                    {getEventLabel(entry.event)}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {entry.solves.toLocaleString()} solves
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Monthly activity bar chart                                          */
/* ------------------------------------------------------------------ */

function MonthlyChartSection({ stats }: { stats: WrappedStats }) {
  return (
    <Card className="border-border/50">
      <CardContent className="px-6 py-6">
        <p className="mb-4 text-xs font-medium tracking-widest text-primary uppercase">
          Monthly Activity
        </p>
        <div className="h-[220px] sm:h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.monthlyBreakdown}>
              <XAxis
                dataKey="month"
                tick={{ fill: "#8B8BA3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8B8BA3", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="solves"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
