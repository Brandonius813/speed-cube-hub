"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Box, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { login, resendSignupConfirmation } from "@/lib/actions/auth"
import { getSupabaseClient } from "@/lib/supabase/client"
import { buildOAuthCallbackUrl } from "@/lib/auth/app-url"
import type { AuthFeedback } from "@/lib/auth/messages"

type LoginContentProps = {
  nextPath: string
  initialFeedback?: AuthFeedback | null
  initialEmail?: string
}

export function LoginContent({
  nextPath,
  initialFeedback,
  initialEmail = "",
}: LoginContentProps) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<AuthFeedback | null>(initialFeedback ?? null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [email, setEmail] = useState(initialEmail)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFeedback(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await login(formData)

    if ("error" in result) {
      setFeedback({
        tone: "error",
        message: result.error,
        showResendConfirmation: result.canResendConfirmation,
      })
      setLoading(false)
      return
    }

    // Navigate client-side so the browser processes auth cookies first.
    router.push(nextPath)
  }

  async function handleResendConfirmation() {
    setFeedback(null)
    setResendLoading(true)

    const result = await resendSignupConfirmation(email, nextPath)

    if ("error" in result) {
      setFeedback({
        tone: "error",
        message: result.error,
        showResendConfirmation: true,
      })
      setResendLoading(false)
      return
    }

    setFeedback({
      tone: "success",
      message: "A fresh confirmation email is on the way.",
    })
    setResendLoading(false)
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
            <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Log in to your account</p>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={googleLoading}
            onClick={async () => {
              setGoogleLoading(true)
              const supabase = getSupabaseClient()
              const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: buildOAuthCallbackUrl(nextPath),
                },
              })
              if (error) {
                setFeedback({
                  tone: "error",
                  message: error.message,
                })
                setGoogleLoading(false)
              }
            }}
            className="min-h-11 w-full gap-2 border-border/50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? "Redirecting..." : "Log in with Google"}
          </Button>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Your password"
                required
                className="min-h-11"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Forgot your password?</span>
              <Link
                href={
                  email
                    ? `/forgot-password?email=${encodeURIComponent(email)}`
                    : "/forgot-password"
                }
                className="text-primary hover:underline"
              >
                Reset it
              </Link>
            </div>

            {feedback && (
              <p
                className={
                  feedback.tone === "error"
                    ? "text-sm text-destructive"
                    : "text-sm text-primary"
                }
                role="alert"
              >
                {feedback.message}
              </p>
            )}

            {feedback?.showResendConfirmation && (
              <Button
                type="button"
                variant="outline"
                disabled={resendLoading || !email.trim()}
                onClick={handleResendConfirmation}
                className="min-h-11 w-full gap-2 border-border/50"
              >
                <Mail className="h-4 w-4" />
                {resendLoading ? "Sending confirmation..." : "Resend confirmation email"}
              </Button>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href={
                nextPath === "/feed"
                  ? "/signup"
                  : `/signup?next=${encodeURIComponent(nextPath)}`
              }
              className="text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
