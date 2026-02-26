"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import { formatDuration } from "@/lib/utils"
import type { DateRange } from "@/components/dashboard/filters"

function getSessionsLabel(range: DateRange): string {
  switch (range) {
    case "1d": return "Sessions Today"
    case "7d": return "Sessions This Week"
    case "30d": return "Sessions in the Last 30 Days"
    case "90d": return "Sessions in the Last 90 Days"
    case "1y": return "Sessions This Year"
    case "365d": return "Sessions in the Last 365 Days"
    case "all": return "Total Sessions"
    case "custom": return "Sessions in Range"
    default: return "Sessions"
  }
}

export function StatsCards({
  stats,
  selectedRange,
}: {
  stats: {
    sessionsThisWeek: number
    totalMinutes: number
    currentStreak: number
    longestStreak: number
    weeklyMinutes: number
    weeklyChange: number
  }
  selectedRange: DateRange
}) {
  const cards = [
    {
      label: getSessionsLabel(selectedRange),
      value: String(stats.sessionsThisWeek),
      icon: Calendar,
      iconColor: "text-primary",
    },
    {
      label: "Total Practice Time",
      value: formatDuration(stats.totalMinutes),
      icon: Clock,
      iconColor: "text-accent",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((stat) => (
        <Card key={stat.label} className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-mono text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
