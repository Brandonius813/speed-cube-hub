import { TimerContent } from "@/components/timer/timer-content"
import { TimerErrorBoundary } from "@/components/timer/timer-error-boundary"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Timer — SpeedCubeHub",
  description: "Practice with the built-in cubing timer",
}

async function getTimerViewer() {
  const fallback = { displayName: "Cuber", handle: null as string | null }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return fallback

  const { data } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", user.id)
    .single()

  return {
    displayName: data?.display_name ?? fallback.displayName,
    handle: data?.handle ?? fallback.handle,
  }
}

export default async function TimerPage() {
  const viewer = await getTimerViewer()

  return (
    <TimerErrorBoundary>
      <TimerContent viewer={viewer} />
    </TimerErrorBoundary>
  )
}
