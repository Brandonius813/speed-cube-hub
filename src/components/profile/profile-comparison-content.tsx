import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EventBadge } from "@/components/shared/event-badge"
import type {
  ComparisonEventPracticeRow,
  ComparisonPbResult,
  ComparisonPracticeWindow,
  ComparisonWinner,
  ProfileComparisonData,
} from "@/lib/profile-comparison"
import { formatDuration, cn } from "@/lib/utils"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function winnerLabel(
  winner: ComparisonWinner,
  targetName: string
): string {
  if (winner === "viewer") return "You lead"
  if (winner === "target") return `${targetName} leads`
  if (winner === "tie") return "Tie"
  return "No data yet"
}

function winnerBadgeClass(winner: ComparisonWinner): string {
  if (winner === "viewer") return "bg-primary/15 text-primary"
  if (winner === "target") return "bg-accent/15 text-accent"
  if (winner === "tie") return "bg-secondary text-secondary-foreground"
  return "bg-secondary/60 text-muted-foreground"
}

function pbResultLabel(
  result: ComparisonPbResult,
  targetName: string
): string | null {
  if (result === "viewer") return "You are faster"
  if (result === "target") return `${targetName} is faster`
  if (result === "tie") return "Tie"
  if (result === "viewer_only" || result === "target_only") {
    return "Only one user has logged this PB"
  }
  return null
}

function leadCardTitle(
  events: string[],
  emptyLabel: string
): string {
  if (events.length === 0) return emptyLabel
  if (events.length === 1) return "1 event"
  return `${events.length} events`
}

function CompetitorCard({
  label,
  competitor,
  accentClass,
}: {
  label: string
  competitor: ProfileComparisonData["viewer"]
  accentClass: string
}) {
  return (
    <Card className={cn("border-border/50 bg-card", accentClass)}>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="secondary" className="bg-secondary/70 text-foreground">
            {label}
          </Badge>
          <div className="text-right text-xs text-muted-foreground">
            <div>{competitor.sessionCount} sessions</div>
            <div>{competitor.totalSolves.toLocaleString()} solves</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 border border-border/50">
            {competitor.avatarUrl && (
              <AvatarImage
                src={competitor.avatarUrl}
                alt={competitor.displayName}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
              {getInitials(competitor.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-foreground">
              {competitor.displayName}
            </div>
            <div className="truncate text-sm text-muted-foreground">
              @{competitor.handle}
            </div>
          </div>
        </div>

        {competitor.mainEvents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {competitor.mainEvents.map((eventId) => (
              <EventBadge key={eventId} event={eventId} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-secondary/30 p-3 text-sm">
          <div>
            <div className="text-muted-foreground">All-time practice</div>
            <div className="font-mono text-base font-semibold text-foreground">
              {formatDuration(competitor.totalMinutes)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Total solves</div>
            <div className="font-mono text-base font-semibold text-foreground">
              {competitor.totalSolves.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PracticeWindowCard({
  window,
  targetName,
  viewerName,
}: {
  window: ComparisonPracticeWindow
  targetName: string
  viewerName: string
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{window.label}</CardTitle>
          <Badge className={winnerBadgeClass(window.winner)}>
            {winnerLabel(window.winner, targetName)}
          </Badge>
        </div>
        <CardDescription>
          Winner is based on total practice time in this rolling window.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {[
          {
            label: viewerName,
            totals: window.viewer,
            winner: window.winner === "viewer",
          },
          {
            label: targetName,
            totals: window.target,
            winner: window.winner === "target",
          },
        ].map((entry) => (
          <div
            key={entry.label}
            className={cn(
              "rounded-lg border border-border/50 bg-secondary/30 p-4",
              entry.winner && "border-primary/40 bg-primary/5"
            )}
          >
            <div className="mb-3 text-sm font-medium text-foreground">
              {entry.label}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Practice</div>
                <div className="font-mono text-lg font-semibold text-foreground">
                  {formatDuration(entry.totals.minutes)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Sessions</div>
                <div className="font-mono text-lg font-semibold text-foreground">
                  {entry.totals.sessions}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Solves</div>
                <div className="font-mono text-lg font-semibold text-foreground">
                  {entry.totals.solves.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function EventPracticeMobileRow({
  row,
  targetName,
}: {
  row: ComparisonEventPracticeRow
  targetName: string
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-medium text-foreground">{row.eventLabel}</div>
        <div className="flex gap-2">
          <Badge className={winnerBadgeClass(row.minutesWinner)}>
            Time: {winnerLabel(row.minutesWinner, targetName)}
          </Badge>
          <Badge className={winnerBadgeClass(row.solvesWinner)}>
            Solves: {winnerLabel(row.solvesWinner, targetName)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-background/60 p-3">
          <div className="text-xs text-muted-foreground">You</div>
          <div className="mt-2 space-y-1">
            <div className="font-mono text-sm text-foreground">
              {formatDuration(row.viewer.minutes)}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              {row.viewer.solves.toLocaleString()} solves
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-background/60 p-3">
          <div className="text-xs text-muted-foreground">{targetName}</div>
          <div className="mt-2 space-y-1">
            <div className="font-mono text-sm text-foreground">
              {formatDuration(row.target.minutes)}
            </div>
            <div className="font-mono text-sm text-muted-foreground">
              {row.target.solves.toLocaleString()} solves
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProfileComparisonContent({
  data,
}: {
  data: ProfileComparisonData
}) {
  const hasPracticeData = data.eventPracticeRows.some(
    (row) =>
      row.viewer.minutes > 0 ||
      row.viewer.solves > 0 ||
      row.target.minutes > 0 ||
      row.target.solves > 0
  )
  const hasPbData = data.pbEventRows.length > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild className="min-h-11 px-0 text-sm sm:px-3">
          <Link href={`/profile/${data.target.handle}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to @{data.target.handle}
          </Link>
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold text-foreground">
            You vs @{data.target.handle}
          </h1>
          <p className="text-sm text-muted-foreground">
            Side-by-side practice and PB comparison.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
        <CompetitorCard
          label="You"
          competitor={data.viewer}
          accentClass="border-primary/25"
        />
        <CompetitorCard
          label={data.target.displayName}
          competitor={data.target}
          accentClass="border-accent/25"
        />
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle>PB Lead Summary</CardTitle>
            <CardDescription>
              Event leads are based only on PB types both users have logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-lg bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">You lead</div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {data.summaryLeads.viewerLeadEvents.length}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">
                {data.target.displayName} leads
              </div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {data.summaryLeads.targetLeadEvents.length}
              </div>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3">
              <div className="text-xs text-muted-foreground">Comparable events</div>
              <div className="font-mono text-2xl font-bold text-foreground">
                {data.summaryLeads.comparableEventCount}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        {data.practiceWindows.map((window) => (
          <PracticeWindowCard
            key={window.key}
            window={window}
            targetName={data.target.displayName}
            viewerName="You"
          />
        ))}
      </section>

      <section>
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle>Practice by Event</CardTitle>
            <CardDescription>
              All-time time invested and solve totals, event by event.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasPracticeData ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-secondary/20 p-6 text-sm text-muted-foreground">
                No practice sessions logged yet for either user.
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground">
                        <th className="py-3 pr-4 text-left font-medium">Event</th>
                        <th className="px-4 py-3 text-right font-medium">Your Time</th>
                        <th className="px-4 py-3 text-right font-medium">
                          {data.target.displayName} Time
                        </th>
                        <th className="px-4 py-3 text-right font-medium">Your Solves</th>
                        <th className="px-4 py-3 text-right font-medium">
                          {data.target.displayName} Solves
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.eventPracticeRows.map((row) => (
                        <tr key={row.eventId} className="border-b border-border/20">
                          <td className="py-3 pr-4 font-medium text-foreground">
                            {row.eventLabel}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-mono text-foreground",
                              row.minutesWinner === "viewer" && "text-primary"
                            )}
                          >
                            {formatDuration(row.viewer.minutes)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-mono text-foreground",
                              row.minutesWinner === "target" && "text-accent"
                            )}
                          >
                            {formatDuration(row.target.minutes)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-mono text-foreground",
                              row.solvesWinner === "viewer" && "text-primary"
                            )}
                          >
                            {row.viewer.solves.toLocaleString()}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-3 text-right font-mono text-foreground",
                              row.solvesWinner === "target" && "text-accent"
                            )}
                          >
                            {row.target.solves.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 md:hidden">
                  {data.eventPracticeRows.map((row) => (
                    <EventPracticeMobileRow
                      key={row.eventId}
                      row={row}
                      targetName={data.target.displayName}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle>PB Head-to-Head</CardTitle>
            <CardDescription>
              Current PBs compared by event across all logged PB types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!hasPbData ? (
              <div className="rounded-lg border border-dashed border-border/60 bg-secondary/20 p-6 text-sm text-muted-foreground">
                No current PBs logged yet for either user.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {data.pbEventRows.map((eventRow) => (
                  <Card key={eventRow.eventId} className="border-border/40 bg-secondary/20">
                    <CardHeader className="gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg">{eventRow.eventLabel}</CardTitle>
                        <Badge className={winnerBadgeClass(eventRow.lead)}>
                          {winnerLabel(eventRow.lead, data.target.displayName)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {eventRow.rows.map((row) => (
                        <div
                          key={row.pbType}
                          className="rounded-lg border border-border/50 bg-background/70 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="text-sm font-medium text-foreground">
                              {row.pbType}
                            </div>
                            {pbResultLabel(row.result, data.target.displayName) && (
                              <Badge className={winnerBadgeClass(
                                row.result === "viewer"
                                  ? "viewer"
                                  : row.result === "target"
                                    ? "target"
                                    : row.result === "tie"
                                      ? "tie"
                                      : null
                              )}>
                                {pbResultLabel(row.result, data.target.displayName)}
                              </Badge>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div
                              className={cn(
                                "rounded-md bg-secondary/30 p-3",
                                row.result === "viewer" && "bg-primary/10"
                              )}
                            >
                              <div className="text-xs text-muted-foreground">You</div>
                              <div className="font-mono text-base font-semibold text-foreground">
                                {row.viewerDisplay ?? "No current PB"}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "rounded-md bg-secondary/30 p-3",
                                row.result === "target" && "bg-accent/10"
                              )}
                            >
                              <div className="text-xs text-muted-foreground">
                                {data.target.displayName}
                              </div>
                              <div className="font-mono text-base font-semibold text-foreground">
                                {row.targetDisplay ?? "No current PB"}
                              </div>
                            </div>
                          </div>
                          {row.note && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {row.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle>You’re Faster At</CardTitle>
            <CardDescription>
              {leadCardTitle(
                data.summaryLeads.viewerLeadEvents,
                "No event leads yet"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.summaryLeads.viewerLeadEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                You do not have a clear PB lead on any shared event yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.summaryLeads.viewerLeadEvents.map((eventLabel) => (
                  <Badge key={eventLabel} className="bg-primary/15 text-primary">
                    {eventLabel}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle>You’re Slower At</CardTitle>
            <CardDescription>
              {leadCardTitle(
                data.summaryLeads.targetLeadEvents,
                "No event deficits yet"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.summaryLeads.targetLeadEvents.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {data.target.displayName} does not have a clear PB lead on any shared event yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.summaryLeads.targetLeadEvents.map((eventLabel) => (
                  <Badge key={eventLabel} className="bg-accent/15 text-accent">
                    {eventLabel}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
