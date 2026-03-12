"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Box, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getNavbarData } from "@/lib/actions/auth"
import { ThemeToggle } from "@/components/shared/theme-toggle"

const LoggedInNavbarControlsLazy = dynamic(
  () =>
    import("@/components/shared/logged-in-navbar-controls").then(
      (module) => module.LoggedInNavbarControls
    ),
  {
    ssr: false,
    loading: () => null,
  }
)

export function Navbar() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userProfile, setUserProfile] = useState<{
    avatar_url: string | null
    display_name: string
  } | null>(null)

  // Returns true if the current path matches the link's href
  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  // Desktop text nav link classes
  function navLinkClass(href: string) {
    return cn(
      "flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors sm:min-h-0 sm:min-w-0",
      isActive(href)
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )
  }

  // Mobile icon classes (brighter when active)
  function navIconClass(href: string) {
    return cn(
      "h-5 w-5",
      isActive(href) ? "text-foreground" : ""
    )
  }

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Single server action replaces 3 separate calls + their internal getUser() calls
    async function loadNavbar() {
      try {
        const data = await getNavbarData()
        if (data.isLoggedIn) {
          setIsLoggedIn(true)
          setUserProfile({
            avatar_url: data.avatarUrl,
            display_name: data.displayName,
          })
          setUnreadCount(data.unreadCount)
        } else {
          setIsLoggedIn(false)
          setUserProfile(null)
          setUnreadCount(0)
        }
      } catch {
        // Network error — keep showing logged-out state
      }
    }

    loadNavbar()

    // Only use onAuthStateChange to detect sign-out — no re-fetch needed
    // for sign-in since loadNavbar() already ran on mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsLoggedIn(false)
        setUserProfile(null)
        setUnreadCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Re-fetch unread count when notifications are marked as read
  useEffect(() => {
    function handleUpdate() {
      getNavbarData().then((data) => {
        if (data.isLoggedIn) setUnreadCount(data.unreadCount)
      }).catch(() => {
        // Notification count refresh failed — keep current count
      })
    }
    window.addEventListener("notifications-updated", handleUpdate)
    return () => window.removeEventListener("notifications-updated", handleUpdate)
  }, [])

  // Re-fetch navbar data when profile is updated (avatar, display name)
  useEffect(() => {
    function handleProfileUpdate() {
      getNavbarData().then((data) => {
        if (data.isLoggedIn) {
          setUserProfile({
            avatar_url: data.avatarUrl,
            display_name: data.displayName,
          })
        }
      }).catch(() => {
        // Profile refresh failed — keep current state
      })
    }
    window.addEventListener("profile-updated", handleProfileUpdate)
    return () => window.removeEventListener("profile-updated", handleProfileUpdate)
  }, [])

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
          <LoggedInNavbarControlsLazy
            pathname={pathname}
            unreadCount={unreadCount}
            setUnreadCount={setUnreadCount}
            userProfile={userProfile}
          />
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/leaderboards" className={navLinkClass("/leaderboards")} aria-label="Leaderboards">
              <Trophy className={cn(navIconClass("/leaderboards"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/leaderboards") && "border-b-2 border-primary pb-0.5")}>Leaderboards</span>
            </Link>
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
