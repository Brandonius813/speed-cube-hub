import { TimerContent } from "@/components/timer/timer-content"
import { TimerErrorBoundary } from "@/components/timer/timer-error-boundary"

export const metadata = {
  title: "Timer — SpeedCubeHub",
  description: "Practice with the built-in cubing timer",
}

export default function TimerPage() {
  return (
    <TimerErrorBoundary>
      <TimerContent />
    </TimerErrorBoundary>
  )
}
