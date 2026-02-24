"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Box, LogOut, LayoutDashboard, Medal, Rss, Search, Shield, Trophy, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { getSupabaseClient } from "@/lib/supabase/client"
import { getUnreadCount } from "@/lib/actions/notifications"
import { getProfile } from "@/lib/actions/profiles"
import { checkIsAdmin } from "@/lib/actions/auth"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userProfile, setUserProfile] = useState<{
    avatar_url: string | null
    display_name: string
  } | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)

      if (user) {
        const [profileResult, notifResult, adminResult] = await Promise.all([
          getProfile(),
          getUnreadCount(),
          checkIsAdmin(),
        ])

        if (profileResult.profile) {
          setUserProfile({
            avatar_url: profileResult.profile.avatar_url,
            display_name: profileResult.profile.display_name,
          })
        }

        setUnreadCount(notifResult.count)
        setIsAdmin(adminResult)
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session?.user)

      if (session?.user) {
        const [profileResult, notifResult, adminResult] = await Promise.all([
          getProfile(),
          getUnreadCount(),
          checkIsAdmin(),
        ])

        if (profileResult.profile) {
          setUserProfile({
            avatar_url: profileResult.profile.avatar_url,
            display_name: profileResult.profile.display_name,
          })
        }

        setUnreadCount(notifResult.count)
        setIsAdmin(adminResult)
      } else {
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
      getUnreadCount().then((result) => setUnreadCount(result.count))
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
            <Link
              href="/feed"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Feed"
            >
              <Rss className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Feed</span>
            </Link>
            <Link
              href="/discover"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Discover"
            >
              <Search className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Discover</span>
            </Link>
            <Link
              href="/leaderboards"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Leaderboards"
            >
              <Trophy className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Leaderboards</span>
            </Link>
            <Link
              href="/pbs"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Personal Bests"
            >
              <Medal className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">PBs</span>
            </Link>
            <Link
              href="/practice-stats"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Practice Stats"
            >
              <LayoutDashboard className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Practice Stats</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin/badges"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-yellow-400 transition-colors hover:text-yellow-300 sm:min-h-0 sm:min-w-0"
                aria-label="Admin"
              >
                <Shield className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/notifications"
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white sm:-right-1.5 sm:-top-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:opacity-80 sm:min-h-0 sm:min-w-0"
              aria-label="Profile"
            >
              <Avatar className="h-7 w-7 border border-border">
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
            <Link
              href="/leaderboards"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:min-w-0"
              aria-label="Leaderboards"
            >
              <Trophy className="h-4 w-4 sm:hidden" />
              <span className="hidden text-sm sm:inline">Leaderboards</span>
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
