"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react"
import {
  approveCompetitiveAchievementClaim,
  rejectCompetitiveAchievementClaim,
} from "@/lib/actions/badges"
import type { PendingBadgeClaim } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function AchievementQueueContent({
  initialClaims,
}: {
  initialClaims: PendingBadgeClaim[]
}) {
  const [claims, setClaims] = useState(initialClaims)
  const [notesById, setNotesById] = useState<Record<string, string>>({})
  const [errorById, setErrorById] = useState<Record<string, string>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleApprove(claimId: string) {
    setLoadingId(claimId)
    setErrorById((prev) => ({ ...prev, [claimId]: "" }))

    const note = notesById[claimId]?.trim() || undefined
    const result = await approveCompetitiveAchievementClaim(claimId, note)

    if (!result.success) {
      setErrorById((prev) => ({ ...prev, [claimId]: result.error ?? "Failed to approve claim." }))
      setLoadingId(null)
      return
    }

    setClaims((prev) => prev.filter((c) => c.id !== claimId))
    setLoadingId(null)
  }

  async function handleReject(claimId: string) {
    const note = notesById[claimId]?.trim() || ""
    if (note.length < 3) {
      setErrorById((prev) => ({ ...prev, [claimId]: "Please include a short rejection reason (3+ characters)." }))
      return
    }

    setLoadingId(claimId)
    setErrorById((prev) => ({ ...prev, [claimId]: "" }))

    const result = await rejectCompetitiveAchievementClaim(claimId, note)
    if (!result.success) {
      setErrorById((prev) => ({ ...prev, [claimId]: result.error ?? "Failed to reject claim." }))
      setLoadingId(null)
      return
    }

    setClaims((prev) => prev.filter((c) => c.id !== claimId))
    setLoadingId(null)
  }

  if (claims.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-8 text-center">
        <p className="text-muted-foreground">No pending achievement claims.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {claims.map((claim) => {
        const note = notesById[claim.id] ?? ""
        const error = errorById[claim.id]
        const isLoading = loadingId === claim.id

        return (
          <Card key={claim.id} className="border-border/50 bg-card">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <Link href={`/profile/${claim.profile.handle}`} className="shrink-0">
                  <Avatar className="h-10 w-10 border border-border">
                    {claim.profile.avatar_url && (
                      <AvatarImage src={claim.profile.avatar_url} alt={claim.profile.display_name} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(claim.profile.display_name)}
                    </AvatarFallback>
                  </Avatar>
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {claim.profile.display_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{claim.profile.handle}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-lg leading-none">{claim.badge.icon || "🎖️"}</span>
                    <span className="font-medium text-foreground">{claim.badge.name}</span>
                    {claim.year && (
                      <span className="rounded-full border border-border/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {claim.year}
                      </span>
                    )}
                    {claim.is_current && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        Current
                      </span>
                    )}
                  </div>

                  {claim.detail && (
                    <p className="mt-2 text-sm text-foreground/90">{claim.detail}</p>
                  )}

                  {claim.evidence_url && (
                    <a
                      href={claim.evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm text-primary hover:text-primary/80"
                    >
                      View WCA Evidence
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  value={note}
                  onChange={(e) =>
                    setNotesById((prev) => ({ ...prev, [claim.id]: e.target.value }))
                  }
                  placeholder="Optional approval note or required rejection reason"
                  className="min-h-20"
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => handleApprove(claim.id)}
                  disabled={isLoading}
                  className="min-h-11 gap-2 bg-green-600 text-white hover:bg-green-600/90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isLoading ? "Working..." : "Approve"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleReject(claim.id)}
                  disabled={isLoading}
                  className="min-h-11 gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" />
                  {isLoading ? "Working..." : "Reject"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
