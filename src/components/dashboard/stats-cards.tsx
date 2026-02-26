"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"
import { formatDuration } from "@/lib/utils"

export function StatsCards({
  stats,
}: {
  stats: {
    sessionsThisWeek: number
    totalMinutes: number
    currentStreak: number
    longestStreak: number
    weeklyMinutes: number
    weeklyChange: number
  }
}) {
  const cards = [
    {
      label: "Sessions This Week",
      value: String(stats.sessionsThisWeek),
      change:
        stats.weeklyChange > 0
          ? `+${stats.weeklyChange} from last week`
          : stats.weeklyChange < 0
            ? `${stats.weeklyChange} from last week`
            : "Same as last week",
      icon: Calendar,
      iconColor: "text-primary",
    },
    {
      label: "Total Practice Time",
      value: formatDuration(stats.totalMinutes),
      change: `${formatDuration(stats.weeklyMinutes)} this week`,
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
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
