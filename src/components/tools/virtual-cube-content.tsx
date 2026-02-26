"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { RotateCcw, Shuffle, Keyboard, Timer, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateScramble } from "@/lib/timer/scrambles"
import { ALL_TIMER_EVENTS } from "@/lib/constants"
import { cn } from "@/lib/utils"

// Supported puzzles for virtual cube
const VIRTUAL_CUBE_EVENTS = ALL_TIMER_EVENTS.filter((e) =>
  ["333", "222", "444", "555", "pyram", "skewb", "sq1", "minx", "clock"].includes(e.id)
)

// Map event IDs to cubing.js puzzle names
const CUBING_PUZZLE_MAP: Record<string, string> = {
  "333": "3x3x3",
  "222": "2x2x2",
  "444": "4x4x4",
  "555": "5x5x5",
  pyram: "pyraminx",
  skewb: "skewb",
  sq1: "square1",
  minx: "megaminx",
  clock: "clock",
}

export function VirtualCubeContent() {
  const [event, setEvent] = useState("333")
  const [scramble, setScramble] = useState<string | null>(null)
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [isTiming, setIsTiming] = useState(false)
  const [timeMs, setTimeMs] = useState(0)
  const [showEventPicker, setShowEventPicker] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const twistyRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const eventPickerRef = useRef<HTMLDivElement>(null)

  // Load cubing library dynamically (web components need client-side only)
  useEffect(() => {
    import("cubing/twisty").catch(() => {
      // Web component registers itself globally
    })
  }, [])

  // Create/update twisty player
  useEffect(() => {
    if (!playerRef.current) return

    // Remove old player
    if (twistyRef.current) {
      twistyRef.current.remove()
      twistyRef.current = null
    }

    const player = document.createElement("twisty-player")
    player.setAttribute("puzzle", CUBING_PUZZLE_MAP[event] ?? "3x3x3")
    player.setAttribute("visualization", "3D")
    player.setAttribute("control-panel", "none")
    player.setAttribute("background", "none")
    player.setAttribute("tempo-scale", "2")
    player.style.width = "100%"
    player.style.height = "100%"

    if (scramble) {
      player.setAttribute("alg", scramble)
    }

    playerRef.current.appendChild(player)
    twistyRef.current = player
  }, [event, scramble])

  const handleNewScramble = useCallback(() => {
    const s = generateScramble(event)
    setScramble(s)
  }, [event])

  const handleReset = useCallback(() => {
    setScramble(null)
    setIsTiming(false)
    setTimeMs(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const handleEventChange = useCallback((newEvent: string) => {
    setEvent(newEvent)
    setScramble(null)
    setShowEventPicker(false)
  }, [])

  // Timer controls
  const toggleTimer = useCallback(() => {
    if (isTiming) {
      setIsTiming(false)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      setIsTiming(true)
      setTimeMs(0)
      startTimeRef.current = performance.now()
      timerRef.current = setInterval(() => {
        setTimeMs(Math.round(performance.now() - startTimeRef.current))
      }, 10)
    }
  }, [isTiming])

  // Close event picker on outside click
  useEffect(() => {
    if (!showEventPicker) return
    const handleClick = (e: MouseEvent) => {
      if (eventPickerRef.current && !eventPickerRef.current.contains(e.target as Node)) {
        setShowEventPicker(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showEventPicker])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const formatTime = (ms: number) => {
    const secs = Math.floor(ms / 1000)
    const cents = Math.floor((ms % 1000) / 10)
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    if (mins > 0) return `${mins}:${String(remSecs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`
    return `${remSecs}.${String(cents).padStart(2, "0")}`
  }

  const eventLabel = VIRTUAL_CUBE_EVENTS.find((e) => e.id === event)?.label ?? event

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Virtual Cube</h1>
        <p className="text-sm text-muted-foreground">Drag to rotate, use keyboard to make moves</p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Event picker */}
        <div className="relative" ref={eventPickerRef}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowEventPicker(!showEventPicker)}
          >
            {eventLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          {showEventPicker && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
              {VIRTUAL_CUBE_EVENTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleEventChange(e.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors",
                    event === e.id && "bg-secondary font-medium"
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleNewScramble}>
          <Shuffle className="h-3.5 w-3.5" />
          Scramble
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowKeyboard(!showKeyboard)}
        >
          <Keyboard className="h-3.5 w-3.5" />
          Keys
        </Button>
        <Button
          variant={isTiming ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={toggleTimer}
        >
          <Timer className="h-3.5 w-3.5" />
          {isTiming ? formatTime(timeMs) : "Timer"}
        </Button>
      </div>

      {/* Scramble display */}
      {scramble && (
        <div className="px-3 py-2 bg-secondary/30 rounded-lg">
          <p className="text-sm font-mono text-center break-words">{scramble}</p>
        </div>
      )}

      {/* 3D Cube viewer */}
      <div
        ref={playerRef}
        className="w-full aspect-square max-h-[500px] bg-secondary/10 rounded-xl border border-border/50 overflow-hidden"
      />

      {/* Keyboard reference */}
      {showKeyboard && (
        <div className="rounded-lg bg-secondary/30 p-4 space-y-3">
          <h3 className="text-sm font-medium">Keyboard Controls</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
            {[
              ["I / K", "R / R'"],
              ["J / L", "U / U'"],
              ["F / D", "F / F'"],
              ["S / E", "D / D'"],
              ["H / G", "L / L'"],
              ["W / O", "B / B'"],
              ["U / M", "r / r'"],
              ["V / R", "l / l'"],
              ["T / Y", "x / x'"],
              ["; / A", "y / y'"],
              ["P / Q", "z / z'"],
            ].map(([keys, moves]) => (
              <div key={keys} className="flex justify-between gap-2">
                <span className="font-mono text-muted-foreground">{keys}</span>
                <span className="font-mono font-medium">{moves}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Click the cube first to focus it. Keys follow standard cubing keyboard layout.
          </p>
        </div>
      )}
    </div>
  )
}
