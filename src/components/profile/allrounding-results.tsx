"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe } from "lucide-react"
import type { UserSorKinchStats } from "@/lib/actions/sor-kinch"

function percentile(rank: number, total: number): string {
  const pct = (rank / total) * 100
  if (pct < 1) return "Top <1%"
  return `Top ${Math.round(pct)}%`
}

type RowProps = {
  label: string
  rank: number | null
  total: number | null
  value?: string
}

function StatRow({ label, rank, total, value }: RowProps) {
  if (rank == null || total == null) return null

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground sm:text-sm">{label}</p>
        {value && (
          <p className="font-mono text-[10px] text-muted-foreground sm:text-xs">
            {value}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <p className="font-mono text-sm font-bold text-foreground sm:text-base">
          #{rank.toLocaleString()}
        </p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-medium text-primary sm:text-xs">
          {percentile(rank, total)}
        </span>
      </div>
    </div>
  )
}

export function AllroundingResults({
  stats,
}: {
  stats: UserSorKinchStats
}) {
  const hasAnything =
    stats.sorSingleRank != null ||
    stats.sorAverageRank != null ||
    stats.kinchRank != null

  if (!hasAnything) return null

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          Allrounding Results
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <StatRow
          label="SOR Single"
          rank={stats.sorSingleRank}
          total={stats.sorSingleTotal}
          value={stats.sorSingleValue != null ? `Score: ${stats.sorSingleValue.toLocaleString()}` : undefined}
        />
        <StatRow
          label="SOR Average"
          rank={stats.sorAverageRank}
          total={stats.sorAverageTotal}
          value={stats.sorAverageValue != null ? `Score: ${stats.sorAverageValue.toLocaleString()}` : undefined}
        />
        <StatRow
          label="Kinch Score"
          rank={stats.kinchRank}
          total={stats.kinchTotal}
          value={stats.kinchScore != null ? `Score: ${stats.kinchScore.toFixed(2)}` : undefined}
        />
      </CardContent>
    </Card>
  )
}
