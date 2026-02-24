import { NotificationsContent } from "@/components/notifications/notifications-content"
import { getNotifications } from "@/lib/actions/notifications"

export default async function NotificationsPage() {
  const { notifications } = await getNotifications()

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">
        Notifications
      </h1>
      <NotificationsContent initialNotifications={notifications} />
    </main>
  )
}
