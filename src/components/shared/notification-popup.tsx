"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Heart, MessageCircle, UserPlus, Trophy, Award, Loader2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { formatDistanceToNow } from "date-fns"
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notifications"
import type { Notification } from "@/lib/types"

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getNotificationIcon(type: Notification["type"]) {
  switch (type) {
    case "like":
      return <Heart className="h-3.5 w-3.5 text-red-400" />
    case "comment":
      return <MessageCircle className="h-3.5 w-3.5 text-blue-400" />
    case "follow":
      return <UserPlus className="h-3.5 w-3.5 text-green-400" />
    case "pb":
      return <Trophy className="h-3.5 w-3.5 text-yellow-400" />
    case "badge":
      return <Award className="h-3.5 w-3.5 text-purple-400" />
  }
}

function getNotificationMessage(notification: Notification): string {
  const actorName = notification.actor?.display_name ?? "Someone"

  switch (notification.type) {
    case "like":
      return `${actorName} liked your session`
    case "comment":
      return `${actorName} commented on your session`
    case "follow":
      return `${actorName} started following you`
    case "pb":
      return "You set a new personal best!"
    case "badge":
      return "You earned or updated a badge on your profile."
  }
}

function getNotificationLink(notification: Notification): string | null {
  switch (notification.type) {
    case "follow":
      return notification.actor?.handle
        ? `/profile/${notification.actor.handle}`
        : null
    case "like":
    case "comment":
      return "/feed"
    case "pb":
      return "/practice-stats"
    case "badge":
      return "/profile?tab=official"
    default:
      return null
  }
}

export function NotificationPopup({
  unreadCount,
  onUnreadCountChange,
}: {
  unreadCount: number
  onUnreadCountChange: (count: number) => void
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [hadUnread, setHadUnread] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const { notifications: result } = await getNotifications(10)
    setNotifications(result)
    setHadUnread(result.some((n) => !n.read))
    setLoading(false)
  }, [])

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      fetchNotifications()
    } else if (hadUnread) {
      // Mark all as read when closing the popup
      await markAllAsRead()
      onUnreadCountChange(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setHadUnread(false)
      window.dispatchEvent(new Event("notifications-updated"))
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      await markAsRead(notification.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      )
      onUnreadCountChange(Math.max(0, unreadCount - 1))
      window.dispatchEvent(new Event("notifications-updated"))
    }
    const link = getNotificationLink(notification)
    if (link) {
      setOpen(false)
      router.push(link)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white sm:-right-1.5 sm:-top-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-96"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-primary hover:text-primary/80"
              onClick={async () => {
                await markAllAsRead()
                setNotifications((prev) =>
                  prev.map((n) => ({ ...n, read: true }))
                )
                onUnreadCountChange(0)
                setHadUnread(false)
                window.dispatchEvent(new Event("notifications-updated"))
              }}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto sm:max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => {
                const icon = getNotificationIcon(notification.type)
                const message = getNotificationMessage(notification)
                const timeAgo = formatDistanceToNow(
                  new Date(notification.created_at),
                  { addSuffix: true }
                )
                const hasActor =
                  notification.type === "like" ||
                  notification.type === "comment" ||
                  notification.type === "follow"

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Avatar or icon */}
                    <div className="shrink-0">
                      {hasActor && notification.actor ? (
                        <Avatar className="h-8 w-8 border border-border">
                          {notification.actor.avatar_url && (
                            <AvatarImage
                              src={notification.actor.avatar_url}
                              alt={notification.actor.display_name}
                            />
                          )}
                          <AvatarFallback className="text-[9px]">
                            {getInitials(notification.actor.display_name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary">
                          {icon}
                        </div>
                      )}
                    </div>

                    {/* Message + time */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        {hasActor && (
                          <span className="mt-0.5 shrink-0">{icon}</span>
                        )}
                        <p className="text-xs text-foreground leading-snug">
                          {message}
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {timeAgo}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {!notification.read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-2">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block text-center text-xs text-primary hover:text-primary/80"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
