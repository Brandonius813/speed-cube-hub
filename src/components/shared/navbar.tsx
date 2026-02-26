"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Box, LogOut, LayoutDashboard, Medal, Rss, Search, Shield, Timer, Trophy, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getNavbarData } from "@/lib/actions/auth"
import { NotificationPopup } from "@/components/shared/notification-popup"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function Navbar() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
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
      "h-4 w-4",
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
          setIsAdmin(data.isAdmin)
        } else {
          setIsLoggedIn(false)
          setUserProfile(null)
          setUnreadCount(0)
          setIsAdmin(false)
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
        setIsAdmin(false)
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
            <Link href="/timer" className={navLinkClass("/timer")} aria-label="Timer">
              <Timer className={cn(navIconClass("/timer"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/timer") && "border-b-2 border-primary pb-0.5")}>Timer</span>
            </Link>
            <Link href="/feed" className={navLinkClass("/feed")} aria-label="Feed">
              <Rss className={cn(navIconClass("/feed"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/feed") && "border-b-2 border-primary pb-0.5")}>Feed</span>
            </Link>
            <Link href="/discover" className={navLinkClass("/discover")} aria-label="Discover">
              <Search className={cn(navIconClass("/discover"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/discover") && "border-b-2 border-primary pb-0.5")}>Discover</span>
            </Link>
            <Link href="/leaderboards" className={navLinkClass("/leaderboards")} aria-label="Leaderboards">
              <Trophy className={cn(navIconClass("/leaderboards"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/leaderboards") && "border-b-2 border-primary pb-0.5")}>Leaderboards</span>
            </Link>
            <Link href="/pbs" className={navLinkClass("/pbs")} aria-label="Personal Bests">
              <Medal className={cn(navIconClass("/pbs"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/pbs") && "border-b-2 border-primary pb-0.5")}>PBs</span>
            </Link>
            <Link href="/practice-stats" className={navLinkClass("/practice-stats")} aria-label="Practice Stats">
              <LayoutDashboard className={cn(navIconClass("/practice-stats"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/practice-stats") && "border-b-2 border-primary pb-0.5")}>Practice Stats</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/badges"
                className={cn(
                  "flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors sm:min-h-0 sm:min-w-0",
                  isActive("/admin") ? "text-yellow-300" : "text-yellow-400 hover:text-yellow-300"
                )}
                aria-label="Admin"
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <NotificationPopup
              unreadCount={unreadCount}
              onUnreadCountChange={setUnreadCount}
            />
            <Link
              href="/profile"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:opacity-80 sm:min-h-0 sm:min-w-0"
              aria-label="Profile"
            >
              <Avatar className={cn("h-7 w-7 border", isActive("/profile") ? "border-primary ring-2 ring-primary/30" : "border-border")}>
                {userProfile?.avatar_url && (
                  <AvatarImage
                    src={userProfile.avatar_url}
                    alt={userProfile.display_name}
                  />
                )}
                <AvatarFallback className="text-[10px]">
                  {userProfile
                    ? getInitials(userProfile.display_name)
                    : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Link href="/log">
              <Button
                size="sm"
                className="bg-primary text-xs text-primary-foreground hover:bg-primary/90 sm:text-sm"
              >
                Log Session
              </Button>
            </Link>
            <button
              type="button"
              onClick={async () => {
                const supabase = getSupabaseClient()
                await supabase.auth.signOut()
                window.location.href = "/"
              }}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/leaderboards" className={navLinkClass("/leaderboards")} aria-label="Leaderboards">
              <Trophy className={cn(navIconClass("/leaderboards"), "sm:hidden")} />
              <span className={cn("hidden text-sm sm:inline", isActive("/leaderboards") && "border-b-2 border-primary pb-0.5")}>Leaderboards</span>
            </Link>
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
