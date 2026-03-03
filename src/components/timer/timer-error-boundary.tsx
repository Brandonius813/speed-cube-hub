"use client"

import { Component, type ReactNode } from "react"
import { emitTimerTelemetry } from "@/lib/timer/telemetry"

type Props = { children: ReactNode }
type State = { hasError: boolean; errorMessage: string }

export class TimerErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: "" }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error) {
    emitTimerTelemetry("timer_error", {
      scope: "error_boundary",
      message: error.message,
      stack: error.stack?.slice(0, 500),
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="flex max-w-md flex-col items-center text-center">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Timer encountered an error
            </h2>
            <p className="text-sm text-muted-foreground mb-1">
              {this.state.errorMessage}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Your solves are saved. Click below to restart the timer.
            </p>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            >
              Restart Timer
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
