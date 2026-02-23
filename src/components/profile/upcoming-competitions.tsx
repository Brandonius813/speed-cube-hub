"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, ExternalLink, MapPin } from "lucide-react"
import { format, parseISO } from "date-fns"
import type { WcaCompetition } from "@/lib/actions/wca"

function formatDateRange(start: string, end: string): string {
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (start === end) {
    return format(startDate, "MMM d, yyyy")
  }

  // Same month
  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    return `${format(startDate, "MMM d")}–${format(endDate, "d, yyyy")}`
  }

  return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`
}

export function UpcomingCompetitions({
  competitions,
}: {
  competitions: WcaCompetition[]
}) {
  if (competitions.length === 0) return null

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5 text-chart-3" />
          Upcoming Competitions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2.5">
          {competitions.map((comp) => (
            <a
              key={comp.id}
              href={comp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/50 p-3 transition-colors hover:border-chart-3/30"
            >
              <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-chart-3/10">
                <span className="font-mono text-xs font-bold leading-tight text-chart-3">
                  {format(parseISO(comp.start_date), "MMM")}
                </span>
                <span className="font-mono text-sm font-bold leading-tight text-chart-3">
                  {format(parseISO(comp.start_date), "d")}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {comp.name}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {comp.city}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateRange(comp.start_date, comp.end_date)}
                  </span>
                </div>
              </div>

              <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
