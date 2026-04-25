"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, Heart, MessageCircle, UserPlus, Trophy } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications"
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
      return <Heart className="h-4 w-4 text-red-400" />
    case "comment":
      return <MessageCircle className="h-4 w-4 text-blue-400" />
    case "follow":
      return <UserPlus className="h-4 w-4 text-green-400" />
    case "pb":
      return <Trophy className="h-4 w-4 text-yellow-400" />
  }
}

function getNotificationMessage(notification: Notification): string {
  const actorName = notification.actor?.display_name ?? "Someone"

  switch (notification.type) {
    case "like": {
      if (notification.group_count && notification.group_count > 1) {
        const others = notification.group_count - 1
        return `${actorName} and ${others} other${others === 1 ? "" : "s"} liked your session`
      }
      return `${actorName} liked your session`
    }
    case "comment":
      return notification.preview_text
        ? `${actorName}: "${notification.preview_text}"`
        : `${actorName} commented on your session`
    case "follow":
      return `${actorName} started following you`
    case "pb":
      return "You set a new personal best!"
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
      return notification.reference_id
        ? `/feed/entry/${notification.reference_id}`
        : "/feed"
    case "pb":
      return "/practice-stats"
    default:
      return null
  }
}

export function NotificationsContent({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleMarkAsRead(notification: Notification) {
    const ids = notification.group_ids ?? [notification.id]
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
    )
    await Promise.all(ids.map((id) => markAsRead(id)))
    // Tell the navbar to update its badge count
    window.dispatchEvent(new Event("notifications-updated"))
  }

  async function handleMarkAllAsRead() {
    setMarkingAll(true)
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await markAllAsRead()
    setMarkingAll(false)
    // Tell the navbar to update its badge count
    window.dispatchEvent(new Event("notifications-updated"))
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-border/50 bg-card p-8 text-center">
        <Bell className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            No notifications yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When someone likes, comments, or follows you, it will show up here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="text-xs text-primary hover:text-primary/80"
          >
            {markingAll ? "Marking..." : "Mark all as read"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
          />
        ))}
      </div>
    </div>
  )
}

function NotificationCard({
  notification,
  onMarkAsRead,
}: {
  notification: Notification
  onMarkAsRead: (notification: Notification) => void
}) {
  const link = getNotificationLink(notification)
  const message = getNotificationMessage(notification)
  const icon = getNotificationIcon(notification.type)
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  })

  const hasActor =
    notification.type === "like" ||
    notification.type === "comment" ||
    notification.type === "follow"

  function handleClick() {
    if (!notification.read) {
      onMarkAsRead(notification)
    }
  }

  const cardContent = (
    <div
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors sm:p-4 ${
        notification.read
          ? "border-border/50 bg-card"
          : "border-l-2 border-l-primary border-t-border/50 border-r-border/50 border-b-border/50 bg-primary/5"
      }`}
    >
      {/* Actor avatar or icon */}
      <div className="shrink-0">
        {hasActor && notification.actor ? (
          <Avatar className="h-9 w-9 border border-border">
            {notification.actor.avatar_url && (
              <AvatarImage
                src={notification.actor.avatar_url}
                alt={notification.actor.display_name}
              />
            )}
            <AvatarFallback className="text-[10px]">
              {getInitials(notification.actor.display_name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary">
            {icon}
          </div>
        )}
      </div>

      {/* Message + timestamp */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          {hasActor && <span className="mt-0.5 shrink-0">{icon}</span>}
          <p className="text-sm text-foreground">{message}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      {/* Unread indicator dot */}
      {!notification.read && (
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  )

  if (link) {
    return (
      <Link href={link} onClick={handleClick} className="block">
        {cardContent}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left"
    >
      {cardContent}
    </button>
  )
}
