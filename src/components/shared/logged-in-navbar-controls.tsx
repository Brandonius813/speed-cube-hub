"use client"

import dynamic from "next/dynamic"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BarChart3, Bell, ClipboardList, Rss, Trophy, User } from "lucide-react"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import { getSupabaseClient } from "@/lib/supabase/client"
import { NavbarNavLink, navbarIconClass, navbarLinkClass, navbarTextClass } from "@/components/shared/nav-links"
import { cn } from "@/lib/utils"

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
      className={navbarLinkClass(isActive)}
      aria-label="Stats"
    >
      <BarChart3 className={cn(navbarIconClass(isActive), "sm:hidden")} />
      <span className={navbarTextClass(isActive)}>Stats</span>
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
      <NavbarNavLink href="/import" pathname={pathname} label="Import Data" icon={ClipboardList} />
      <NavbarNavLink href="/feed" pathname={pathname} label="Feed" icon={Rss} />
      <StatsNavLink pathname={pathname} />
      <NavbarNavLink href="/leaderboards" pathname={pathname} label="Leaderboards" icon={Trophy} />
      <ThemeToggle />
      <NotificationPopup unreadCount={unreadCount} onUnreadCountChange={setUnreadCount} />
      <Popover open={profileOpen} onOpenChange={setProfileOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="rounded-full p-1 transition-all hover:bg-foreground/10"
            aria-label="User menu"
          >
            <Avatar className={cn("h-14 w-14 border-2", pathname === "/profile" ? "border-primary ring-2 ring-primary/30" : "border-border")}>
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
