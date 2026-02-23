"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, Link2, Loader2, Unlink } from "lucide-react"
import { unlinkWcaId } from "@/lib/actions/wca"

const WCA_AUTH_URL = "https://www.worldcubeassociation.org/oauth/authorize"

function getWcaOAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_WCA_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/api/auth/wca/callback`,
    response_type: "code",
    scope: "public",
  })
  return `${WCA_AUTH_URL}?${params.toString()}`
}

export function WcaLink({
  currentWcaId,
  onUpdate,
}: {
  currentWcaId: string | null
  onUpdate: (wcaId: string | null) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUnlink() {
    setError(null)
    startTransition(async () => {
      const result = await unlinkWcaId()
      if (result.error) {
        setError(result.error)
      } else {
        onUpdate(null)
      }
    })
  }

  // Already linked — show the linked WCA ID with options to view or unlink
  if (currentWcaId) {
    return (
      <div className="rounded-lg border border-border/50 bg-secondary/50 p-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: "#22D3EE20" }}
          >
            <Link2 className="h-4 w-4 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              WCA Profile Linked
            </p>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {currentWcaId}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={`https://www.worldcubeassociation.org/persons/${currentWcaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUnlink}
              disabled={isPending}
              className="text-xs text-destructive hover:text-destructive"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Unlink className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}
      </div>
    )
  }

  // Not linked — show button to start WCA OAuth
  return (
    <div>
      <a
        href={getWcaOAuthUrl()}
        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border/50 bg-secondary/30 p-3 text-left transition-colors hover:border-primary/30"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: "#22D3EE20" }}
        >
          <Link2 className="h-4 w-4 text-accent" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            Link WCA Account
          </p>
          <p className="text-xs text-muted-foreground">
            Sign in with WCA to verify your official results
          </p>
        </div>
      </a>
      {error && (
        <p className="mt-2 text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
