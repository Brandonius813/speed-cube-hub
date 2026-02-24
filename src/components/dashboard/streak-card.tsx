"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Flame, Trophy, Star } from "lucide-react"

const MILESTONES = [
  { days: 7, label: "7 days", icon: Star },
  { days: 30, label: "30 days", icon: Star },
  { days: 100, label: "100 days", icon: Trophy },
  { days: 365, label: "365 days", icon: Trophy },
]

export function StreakCard({
  currentStreak,
  longestStreak,
}: {
  currentStreak: number
  longestStreak: number
}) {
  const isActive = currentStreak > 0

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
          {/* Current streak — prominent */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                isActive ? "bg-orange-500/15" : "bg-secondary"
              }`}
            >
              <Flame
                className={`h-6 w-6 ${
                  isActive ? "text-orange-500" : "text-muted-foreground"
                }`}
                style={
                  isActive
                    ? {
                        animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                      }
                    : undefined
                }
              />
            </div>
            <div>
              <p className="font-mono text-3xl font-bold text-foreground">
                {currentStreak}
              </p>
              <p className="text-xs text-muted-foreground">
                {currentStreak === 1 ? "day streak" : "day streak"}
              </p>
            </div>
          </div>

          {/* Longest streak */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Trophy className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-mono text-xl font-bold text-foreground">
                {longestStreak}
              </p>
              <p className="text-xs text-muted-foreground">longest streak</p>
            </div>
          </div>

          {/* Milestones */}
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {MILESTONES.map((m) => {
              const earned = longestStreak >= m.days
              return (
                <div
                  key={m.days}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                    earned
                      ? "bg-accent/15 text-accent"
                      : "bg-secondary/50 text-muted-foreground/50"
                  }`}
                >
                  <m.icon className="h-3 w-3" />
                  {m.label}
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
