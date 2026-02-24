"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Root Error]", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center text-center">
        <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
        <h1 className="text-xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We hit an unexpected error. Try refreshing — if the problem persists,
          let us know.
        </p>
        <Button onClick={reset} className="mt-6" variant="outline">
          Try again
        </Button>
      </div>
    </div>
  )
}
