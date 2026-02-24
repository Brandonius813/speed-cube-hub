"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[Page Error]", error)
  }, [error])

  return (
    <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
      <h1 className="text-xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We hit an unexpected error loading this page. Try refreshing — if the
        problem persists, let us know.
      </p>
      <Button onClick={reset} className="mt-6" variant="outline">
        Try again
      </Button>
    </main>
  )
}
