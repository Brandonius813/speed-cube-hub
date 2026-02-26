"use client"

import { useState, useEffect, useRef } from "react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getEventLabel } from "@/lib/constants"
import { formatTimeMs } from "@/lib/timer/averages"
import type { UseBattleReturn } from "@/lib/battle/use-battle"

export function BattleSolving({ battle }: { battle: UseBattleReturn }) {
  const [timerState, setTimerState] = useState<"idle" | "ready" | "running" | "stopped">("idle")
  const [displayMs, setDisplayMs] = useState(0)
  const startTimeRef = useRef(0)
  const rafRef = useRef(0)
  const timerStateRef = useRef<"idle" | "ready" | "running" | "stopped">("idle")
  const battleRef = useRef(battle)
  battleRef.current = battle

  useEffect(() => {
    timerStateRef.current = timerState
  }, [timerState])

  const roundNum = battle.scrambleIndex + 1
  const event = battle.roomState?.eventId ?? "333"

  function tick() {
    if (startTimeRef.current > 0) {
      setDisplayMs(performance.now() - startTimeRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  // Keyboard controls
  useEffect(() => {
    if (battle.myResult) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key !== " " || e.repeat) return
      e.preventDefault()

      if (timerStateRef.current === "idle" || timerStateRef.current === "stopped") {
        timerStateRef.current = "ready"
        setTimerState("ready")
      } else if (timerStateRef.current === "running") {
        const elapsed = Math.round(performance.now() - startTimeRef.current)
        cancelAnimationFrame(rafRef.current)
        startTimeRef.current = 0
        setDisplayMs(elapsed)
        timerStateRef.current = "stopped"
        setTimerState("stopped")
        battleRef.current.submitResult(elapsed, null)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " ") return
      e.preventDefault()

      if (timerStateRef.current === "ready") {
        startTimeRef.current = performance.now()
        setDisplayMs(0)
        timerStateRef.current = "running"
        setTimerState("running")
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [battle.myResult])

  // Touch controls
  function handleTouchStart(e: React.TouchEvent) {
    if (battle.myResult) return
    e.preventDefault()

    if (timerStateRef.current === "idle" || timerStateRef.current === "stopped") {
      timerStateRef.current = "ready"
      setTimerState("ready")
    } else if (timerStateRef.current === "running") {
      const elapsed = Math.round(performance.now() - startTimeRef.current)
      cancelAnimationFrame(rafRef.current)
      startTimeRef.current = 0
      setDisplayMs(elapsed)
      timerStateRef.current = "stopped"
      setTimerState("stopped")
      battleRef.current.submitResult(elapsed, null)
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (battle.myResult) return
    e.preventDefault()

    if (timerStateRef.current === "ready") {
      startTimeRef.current = performance.now()
      setDisplayMs(0)
      timerStateRef.current = "running"
      setTimerState("running")
      rafRef.current = requestAnimationFrame(tick)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Reset timer state when new round starts
  useEffect(() => {
    timerStateRef.current = "idle"
    setTimerState("idle")
    setDisplayMs(0)
    startTimeRef.current = 0
    cancelAnimationFrame(rafRef.current)
  }, [battle.scrambleIndex])

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="flex items-center justify-center gap-6 text-center">
        <div>
          <p className="text-2xl font-bold font-mono">{battle.myWins}</p>
          <p className="text-[10px] text-muted-foreground">You</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Round {roundNum}
          {battle.roomState && (
            <span className="block text-[10px]">{getEventLabel(event)}</span>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold font-mono">{battle.opponentWins}</p>
          <p className="text-[10px] text-muted-foreground">Opp</p>
        </div>
      </div>

      {/* Scramble */}
      {battle.scramble && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Scramble</p>
          <p className="font-mono text-sm leading-relaxed break-all">{battle.scramble}</p>
        </div>
      )}

      {/* Timer area */}
      <div
        className="rounded-xl border border-border p-8 text-center select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {battle.myResult ? (
          <div>
            <p className="font-mono text-4xl font-bold tabular-nums">
              {formatTimeMs(battle.myResult.timeMs)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {battle.opponentResult
                ? "Both finished!"
                : "Waiting for opponent..."}
            </p>
          </div>
        ) : (
          <div>
            <p
              className={cn(
                "font-mono text-5xl font-bold tabular-nums transition-colors",
                timerState === "ready" && "text-green-400",
                timerState === "running" && "text-foreground",
                timerState === "idle" && "text-muted-foreground"
              )}
            >
              {formatTimeMs(Math.round(displayMs))}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              {timerState === "idle" && "Hold Space to start"}
              {timerState === "ready" && "Release to start!"}
              {timerState === "running" && "Press Space to stop"}
            </p>
          </div>
        )}
      </div>

      {/* Opponent status */}
      {battle.opponentResult && !battle.myResult && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
          <p className="text-sm text-yellow-400 font-medium">
            Opponent finished: {formatTimeMs(battle.opponentResult.timeMs)}
          </p>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={battle.leaveRoom}>
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        Leave Battle
      </Button>
    </div>
  )
}
