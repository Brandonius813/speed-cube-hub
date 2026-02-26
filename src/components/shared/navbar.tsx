"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Box, Rss, Search, Timer, Trophy, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
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
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
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
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/log">
              <Button
                size="sm"
                className="bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:text-base"
              >
                Log Session
              </Button>
            </Link>
            <Link href="/timer" className={navLinkClass("/timer")} aria-label="Timer">
              <Timer className={cn(navIconClass("/timer"), "sm:hidden")} />
              <span className={cn("hidden text-lg font-bold sm:inline", isActive("/timer") && "border-b-2 border-primary pb-0.5")}>Timer</span>
            </Link>
            <Link href="/feed" className={navLinkClass("/feed")} aria-label="Feed">
              <Rss className={cn(navIconClass("/feed"), "sm:hidden")} />
              <span className={cn("hidden text-lg font-bold sm:inline", isActive("/feed") && "border-b-2 border-primary pb-0.5")}>Feed</span>
            </Link>
            <Link href="/discover" className={navLinkClass("/discover")} aria-label="Discover">
              <Search className={cn(navIconClass("/discover"), "sm:hidden")} />
              <span className={cn("hidden text-lg font-bold sm:inline", isActive("/discover") && "border-b-2 border-primary pb-0.5")}>Discover</span>
            </Link>
            <Link href="/leaderboards" className={navLinkClass("/leaderboards")} aria-label="Leaderboards">
              <Trophy className={cn(navIconClass("/leaderboards"), "sm:hidden")} />
              <span className={cn("hidden text-lg font-bold sm:inline", isActive("/leaderboards") && "border-b-2 border-primary pb-0.5")}>Leaderboards</span>
            </Link>
            <NotificationPopup
              unreadCount={unreadCount}
              onUnreadCountChange={setUnreadCount}
            />
            <Popover open={profileOpen} onOpenChange={setProfileOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-full p-1 transition-all hover:bg-white/10"
                  aria-label="User menu"
                >
                  <Avatar className={cn("h-14 w-14 border-2", isActive("/profile") ? "border-primary ring-2 ring-primary/30" : "border-border")}>
                    {userProfile?.avatar_url && (
                      <AvatarImage
                        src={userProfile.avatar_url}
                        alt={userProfile.display_name}
                      />
                    )}
                    <AvatarFallback className="text-sm">
                      {userProfile
                        ? getInitials(userProfile.display_name)
                        : <User className="h-5 w-5 text-muted-foreground" />}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-56 rounded-lg border border-border/50 p-0 shadow-xl shadow-black/40"
              >
                {/* Display name */}
                <div className="border-b border-border/50 px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">
                    {userProfile?.display_name}
                  </p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/import"
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
                  >
                    Import
                  </Link>
                </div>

                {/* Bottom section — grayed out */}
                <div className="border-t border-border/50 py-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setProfileOpen(false)
                      const supabase = getSupabaseClient()
                      await supabase.auth.signOut()
                      window.location.href = "/"
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/50"
                  >
                    Log out
                  </button>
                </div>
              </PopoverContent>
            </Popover>
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
