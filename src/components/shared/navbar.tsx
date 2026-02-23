"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Box, LogOut, LayoutDashboard, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { logout } from "@/lib/actions/auth"

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Box className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold text-foreground sm:text-lg">
            SpeedCubeHub
          </span>
        </Link>

        {isLoggedIn ? (
          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              href="/dashboard"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Dashboard"
            >
              <LayoutDashboard className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/profile"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Profile"
            >
              <User className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Profile</span>
            </Link>
            <Link href="/log">
              <Button
                size="sm"
                className="bg-primary text-xs text-primary-foreground hover:bg-primary/90 sm:text-sm"
              >
                Log Session
              </Button>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground sm:text-sm"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="bg-primary text-xs text-primary-foreground hover:bg-primary/90 sm:text-sm"
              >
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </nav>
    </header>
  )
}
