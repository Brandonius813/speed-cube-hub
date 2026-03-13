"use client"

import { useState } from "react"
import Link from "next/link"
import { Box, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestPasswordReset } from "@/lib/actions/auth"

type ForgotPasswordContentProps = {
  initialEmail?: string
}

export function ForgotPasswordContent({
  initialEmail = "",
}: ForgotPasswordContentProps) {
  const [email, setEmail] = useState(initialEmail)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const result = await requestPasswordReset(email)

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
            <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
            <p className="text-center text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a secure reset link.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                If that email is in Speed Cube Hub, a reset link is on the way.
              </p>
              <Button asChild className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/login?notice=password_reset_sent">Back to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
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
                className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? "Sending reset email..." : "Send reset email"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
