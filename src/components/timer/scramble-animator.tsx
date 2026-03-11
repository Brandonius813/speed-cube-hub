"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react"
import { getImage } from "cstimer_module"
import { cn } from "@/lib/utils"
import {
  Square1State,
  parseSquare1Algorithm,
  renderSquare1Svg,
  splitSquare1Tokens,
} from "@/lib/timer/square1"

const CSTIMER_TYPE_MAP: Record<string, string> = {
  "333": "333",
  "222": "222so",
  "444": "444wca",
  "555": "555wca",
  "666": "666wca",
  "777": "777wca",
  "333bf": "333ni",
  "444bf": "444bld",
  "555bf": "555bld",
  "333mbf": "333ni",
  "333oh": "333oh",
  "333fm": "333fm",
  pyram: "pyrso",
  skewb: "skbso",
  clock: "clkwca",
  sq1: "sqrs",
  minx: "mgmp",
}

/** Parse scramble notation into individual moves */
function parseMoves(scramble: string): string[] {
  return scramble.trim().split(/\s+/).filter(Boolean)
}

type ScrambleAnimatorProps = {
  scramble: string
  event: string
}

export function ScrambleAnimator({ scramble, event }: ScrambleAnimatorProps) {
  const isSquare1 = event === "sq1"
  const sq1Moves = useMemo(() => {
    if (!isSquare1) return []
    try {
      return parseSquare1Algorithm(scramble)
    } catch {
      return []
    }
  }, [isSquare1, scramble])
  const moves = useMemo(() => {
    if (!isSquare1) return parseMoves(scramble)
    try {
      return splitSquare1Tokens(scramble)
    } catch {
      return []
    }
  }, [isSquare1, scramble])
  const [step, setStep] = useState(moves.length) // Start fully applied
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(500) // ms per move
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const csType = CSTIMER_TYPE_MAP[event]

  // Build partial scramble for current step
  const partialScramble = useMemo(() => {
    if (step === 0) return ""
    return moves.slice(0, step).join(" ")
  }, [moves, step])

  // Get SVG for current state
  const svgString = useMemo(() => {
    if (isSquare1) {
      try {
        let state = Square1State.solved()
        for (let i = 0; i < step; i++) {
          const move = sq1Moves[i]
          if (!move) break
          state = state.applyMove(move)
        }
        return renderSquare1Svg(state)
      } catch {
        return null
      }
    }

    if (!csType) return null
    try {
      return getImage(partialScramble || "", csType)
    } catch {
      return null
    }
  }, [isSquare1, partialScramble, csType, sq1Moves, step])

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setStep((prev: number) => {
        if (prev >= moves.length) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, speed)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, moves.length])

  const handlePlayPause = useCallback(() => {
    if (step >= moves.length) {
      // Reset and play from start
      setStep(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((playing: boolean) => !playing)
    }
  }, [step, moves.length])

  const handlePrev = useCallback(() => {
    setIsPlaying(false)
    setStep((currentStep: number) => Math.max(0, currentStep - 1))
  }, [])

  const handleNext = useCallback(() => {
    setIsPlaying(false)
    setStep((currentStep: number) => Math.min(moves.length, currentStep + 1))
  }, [moves.length])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setStep(0)
  }, [])

  // Keyboard shortcuts when focused
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); handlePrev() }
      else if (e.key === "ArrowRight") { e.preventDefault(); handleNext() }
      else if (e.key === " ") { e.preventDefault(); handlePlayPause() }
      else if (e.key === "Home") { e.preventDefault(); handleReset() }
      else if (e.key === "End") { e.preventDefault(); setIsPlaying(false); setStep(moves.length) }
    },
    [handlePrev, handleNext, handlePlayPause, handleReset, moves.length]
  )

  if (!csType || !svgString) return null

  return (
    <div
      className="space-y-2 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Cube state image */}
      <div
        className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svgString }}
      />

      {/* Move sequence with current move highlighted */}
      <div className="flex flex-wrap gap-1 justify-center px-2">
        {moves.map((move: string, i: number) => (
          <span
            key={i}
            className={cn(
              "text-xs font-mono px-1 py-0.5 rounded cursor-pointer transition-colors",
              i < step
                ? "bg-primary/20 text-foreground"
                : "text-muted-foreground",
              i === step - 1 && "bg-primary text-primary-foreground font-bold"
            )}
            onClick={() => { setIsPlaying(false); setStep(i + 1) }}
          >
            {move}
          </span>
        ))}
      </div>

      {/* Playback controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={handleReset}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Reset (Home)"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
          title="Previous move (←)"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={handleNext}
          disabled={step >= moves.length}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
          title="Next move (→)"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        {/* Speed control */}
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="h-7 text-xs bg-secondary/50 border border-border rounded px-1.5"
          title="Playback speed"
        >
          <option value={1000}>0.5x</option>
          <option value={500}>1x</option>
          <option value={250}>2x</option>
          <option value={125}>4x</option>
        </select>
      </div>

      {/* Step counter */}
      <p className="text-center text-[10px] text-muted-foreground">
        {step} / {moves.length} moves
      </p>
    </div>
  )
}
