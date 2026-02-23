"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, Flame } from "lucide-react"

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  return `${hours}h ${mins}m`
}

export function StatsCards({
  stats,
}: {
  stats: {
    sessionsThisWeek: number
    totalMinutes: number
    currentStreak: number
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
      value: formatMinutes(stats.totalMinutes),
      change: `${formatMinutes(stats.weeklyMinutes)} this week`,
      icon: Clock,
      iconColor: "text-accent",
    },
    {
      label: "Current Streak",
      value: `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
      change: stats.currentStreak > 0 ? "Keep it up!" : "Start practicing!",
      icon: Flame,
      iconColor: "text-chart-1",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
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
