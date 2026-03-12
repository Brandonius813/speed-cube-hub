"use client"

import dynamic from "next/dynamic"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BarChart3, Bell, ClipboardList, Rss, Trophy, User, Users } from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { cn } from "@/lib/utils"
import { getSupabaseClient } from "@/lib/supabase/client"

const NotificationPopup = dynamic(
  () =>
    import("@/components/shared/notification-popup").then(
      (module) => module.NotificationPopup
    ),
  {
    ssr: false,
    loading: () => <NotificationButtonFallback unreadCount={0} />,
  }
)

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function NotificationButtonFallback({
  unreadCount,
}: {
  unreadCount: number
}) {
  return (
    <button
      type="button"
      className="relative flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
      aria-label="Notifications"
      disabled
    >
      <Bell className="h-6 w-6" />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white sm:-right-1.5 sm:-top-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  )
}

function StatsNavLinkInner({ isActive }: { isActive: boolean }) {
  return (
    <Link
      href="/profile?tab=stats"
      className={cn(
        "flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors sm:min-h-0 sm:min-w-0",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-label="Stats"
    >
      <BarChart3
        className={cn("h-5 w-5 sm:hidden", isActive && "text-foreground")}
      />
      <span
        className={cn(
          "hidden text-lg font-bold sm:inline",
          isActive && "border-b-2 border-primary pb-0.5"
        )}
      >
        Stats
      </span>
    </Link>
  )
}

function StatsNavLinkWithSearch({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams()
  const isActive =
    pathname === "/profile" && searchParams.get("tab") === "stats"

  return <StatsNavLinkInner isActive={isActive} />
}

function StatsNavLink({ pathname }: { pathname: string }) {
  return (
    <Suspense fallback={<StatsNavLinkInner isActive={false} />}>
      <StatsNavLinkWithSearch pathname={pathname} />
    </Suspense>
  )
}

export function LoggedInNavbarControls({
  pathname,
  unreadCount,
  setUnreadCount,
  userProfile,
}: {
  pathname: string
  unreadCount: number
  setUnreadCount: (count: number) => void
  userProfile: {
    avatar_url: string | null
    display_name: string
  } | null
}) {
  const [profileOpen, setProfileOpen] = useState(false)

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(href + "/")
  }

  function navLinkClass(href: string) {
    return cn(
      "flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors sm:min-h-0 sm:min-w-0",
      isActive(href)
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground"
    )
  }

  function navIconClass(href: string) {
    return cn("h-5 w-5", isActive(href) ? "text-foreground" : "")
  }

  return (
    <div className="flex items-center gap-2 sm:gap-6">
      <Link href="/timer">
        <Button
          size="sm"
          className="bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:text-base"
        >
          Timer
        </Button>
      </Link>
      <Link href="/import" className={navLinkClass("/import")} aria-label="Import Data">
        <ClipboardList className={cn(navIconClass("/import"), "sm:hidden")} />
        <span className={cn("hidden text-lg font-bold sm:inline", isActive("/import") && "border-b-2 border-primary pb-0.5")}>Import Data</span>
      </Link>
      <Link href="/feed" className={navLinkClass("/feed")} aria-label="Feed">
        <Rss className={cn(navIconClass("/feed"), "sm:hidden")} />
        <span className={cn("hidden text-lg font-bold sm:inline", isActive("/feed") && "border-b-2 border-primary pb-0.5")}>Feed</span>
      </Link>
      <Link href="/clubs" className={navLinkClass("/clubs")} aria-label="Clubs">
        <Users className={cn(navIconClass("/clubs"), "sm:hidden")} />
        <span className={cn("hidden text-lg font-bold sm:inline", isActive("/clubs") && "border-b-2 border-primary pb-0.5")}>Clubs</span>
      </Link>
      <StatsNavLink pathname={pathname} />
      <Link href="/leaderboards" className={navLinkClass("/leaderboards")} aria-label="Leaderboards">
        <Trophy className={cn(navIconClass("/leaderboards"), "sm:hidden")} />
        <span className={cn("hidden text-lg font-bold sm:inline", isActive("/leaderboards") && "border-b-2 border-primary pb-0.5")}>Leaderboards</span>
      </Link>
      <ThemeToggle />
      <NotificationPopup unreadCount={unreadCount} onUnreadCountChange={setUnreadCount} />
      <Popover open={profileOpen} onOpenChange={setProfileOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-full p-1 transition-all hover:bg-foreground/10"
            aria-label="User menu"
          >
            <Avatar className={cn("h-14 w-14 border-2", isActive("/profile") ? "border-primary ring-2 ring-primary/30" : "border-border")}>
              {userProfile?.avatar_url ? (
                <AvatarImage
                  src={userProfile.avatar_url}
                  alt={userProfile.display_name}
                />
              ) : null}
              <AvatarFallback className="text-sm">
                {userProfile ? (
                  getInitials(userProfile.display_name)
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </AvatarFallback>
            </Avatar>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-lg border border-border/50 p-0 shadow-xl shadow-black/40"
        >
          <div className="border-b border-border/50 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              {userProfile?.display_name}
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/profile"
              onClick={() => setProfileOpen(false)}
              className="block px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/50"
            >
              Profile
            </Link>
          </div>

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
  )
}
