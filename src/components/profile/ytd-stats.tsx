"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays } from "lucide-react"
import type { Session } from "@/lib/types"
import { formatDuration } from "@/lib/utils"

export function YtdStats({ sessions }: { sessions: Session[] }) {
  const currentYear = new Date().getFullYear()

  const ytdSessions = sessions.filter((s) => {
    const year = new Date(s.session_date + "T00:00:00").getFullYear()
    return year === currentYear
  })

  if (ytdSessions.length === 0) return null

  const totalSessions = ytdSessions.length
  const totalMinutes = ytdSessions.reduce((sum, s) => sum + s.duration_minutes, 0)
  const totalSolves = ytdSessions.reduce((sum, s) => sum + s.num_solves, 0)

  const stats = [
    { label: "Sessions", value: String(totalSessions) },
    { label: "Time", value: formatDuration(totalMinutes) },
    { label: "Solves", value: totalSolves.toLocaleString() },
  ]

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          {currentYear} Year in Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-mono text-lg font-bold text-foreground">
                {stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
