"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Box, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getNavbarData, type NavbarData } from "@/lib/actions/auth"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { LoggedInNavbarControls } from "@/components/shared/logged-in-navbar-controls"
import { NavbarNavLink } from "@/components/shared/nav-links"

export function NavbarClient({
  initialData,
}: {
  initialData: NavbarData
}) {
  const pathname = usePathname()
  const [navbarData, setNavbarData] = useState(initialData)

  const refreshNavbar = useCallback(async () => {
    try {
      const data = await getNavbarData()
      setNavbarData(data)
    } catch {
      // Keep the current navbar state if the refresh fails.
    }
  }, [])

  useEffect(() => {
    setNavbarData(initialData)
  }, [initialData])

  useEffect(() => {
    const supabase = getSupabaseClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setNavbarData({ isLoggedIn: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function handleNotificationsUpdated() {
      refreshNavbar()
    }

    function handleProfileUpdated() {
      refreshNavbar()
    }

    window.addEventListener("notifications-updated", handleNotificationsUpdated)
    window.addEventListener("profile-updated", handleProfileUpdated)

    return () => {
      window.removeEventListener("notifications-updated", handleNotificationsUpdated)
      window.removeEventListener("profile-updated", handleProfileUpdated)
    }
  }, [refreshNavbar])

  const isLoggedIn = navbarData.isLoggedIn

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href={isLoggedIn ? "/feed" : "/"} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Box className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold text-foreground sm:text-lg">
            SpeedCubeHub
          </span>
        </Link>

        {isLoggedIn ? (
          <LoggedInNavbarControls
            pathname={pathname}
            unreadCount={navbarData.unreadCount}
            setUnreadCount={(count) => {
              setNavbarData((current) =>
                current.isLoggedIn
                  ? { ...current, unreadCount: count }
                  : current
              )
            }}
            userProfile={{
              avatar_url: navbarData.avatarUrl,
              display_name: navbarData.displayName,
            }}
          />
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <NavbarNavLink
              href="/leaderboards"
              pathname={pathname}
              label="Leaderboards"
              icon={Trophy}
            />
            <ThemeToggle />
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
