"use client"

import { useState } from "react"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, User } from "lucide-react"
import { approveBadge, rejectBadge } from "@/lib/actions/badges"
import type { PendingBadgeClaim } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function BadgeQueueContent({
  initialClaims,
}: {
  initialClaims: PendingBadgeClaim[]
}) {
  const [claims, setClaims] = useState(initialClaims)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setLoading(id)
    const result = await approveBadge(id)
    if (result.success) {
      setClaims((prev) => prev.filter((c) => c.id !== id))
    }
    setLoading(null)
  }

  async function handleReject(id: string) {
    setLoading(id)
    const result = await rejectBadge(id)
    if (result.success) {
      setClaims((prev) => prev.filter((c) => c.id !== id))
    }
    setLoading(null)
  }

  if (claims.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        No pending badge claims. All clear!
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {claims.map((claim) => (
        <Card key={claim.id} className="border-border/50 bg-card">
          <CardContent className="flex items-center gap-4 p-4">
            {/* User info */}
            <Link
              href={`/profile/${claim.profile.handle}`}
              className="flex shrink-0 items-center gap-3 min-w-0"
            >
              <Avatar className="h-9 w-9 border border-border">
                {claim.profile.avatar_url && (
                  <AvatarImage
                    src={claim.profile.avatar_url}
                    alt={claim.profile.display_name}
                  />
                )}
                <AvatarFallback className="text-[10px]">
                  {claim.profile.display_name ? (
                    getInitials(claim.profile.display_name)
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {claim.profile.display_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{claim.profile.handle}
                </p>
              </div>
            </Link>

            {/* Badge + claim details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">{claim.badge.icon || "🎖️"}</span>
                <p className="truncate text-sm font-medium text-foreground">
                  {claim.badge.name}
                </p>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {claim.detail}
                {claim.year ? ` (${claim.year})` : ""}
              </p>
            </div>

            {/* Approve / Reject */}
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading === claim.id}
                onClick={() => handleApprove(claim.id)}
                className="min-h-9 gap-1.5 border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={loading === claim.id}
                onClick={() => handleReject(claim.id)}
                className="min-h-9 gap-1.5 border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
