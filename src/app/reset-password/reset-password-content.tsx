"use client"

import { useState } from "react"
import Link from "next/link"
import { Box, CheckCircle2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updatePassword } from "@/lib/actions/auth"

export function ResetPasswordContent() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const result = await updatePassword(new FormData(event.currentTarget))

    if ("error" in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border/50 bg-card">
        <CardContent className="p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <Box className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">SpeedCubeHub</span>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Choose a new password</h1>
            <p className="text-center text-sm text-muted-foreground">
              Use the reset link from your email, then save a fresh password here.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Your password has been updated and your account is ready.
              </p>
              <Button asChild className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/profile">Continue to Profile</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  placeholder="At least 6 characters"
                  required
                  className="min-h-11"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={6}
                  placeholder="Re-enter your new password"
                  required
                  className="min-h-11"
                />
              </div>

              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="min-h-11 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? "Saving password..." : "Save new password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
