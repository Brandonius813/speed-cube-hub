"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const PUZZLE_MAP: Record<string, string> = {
  "333": "3x3x3",
  "222": "2x2x2",
  "444": "4x4x4",
  "555": "5x5x5",
  "666": "6x6x6",
  "777": "7x7x7",
  "333bf": "3x3x3",
  "333mbf": "3x3x3",
  "333oh": "3x3x3",
  pyram: "pyraminx",
  skewb: "skewb",
  clock: "clock",
  sq1: "square1",
  minx: "megaminx",
}

function parseMoves(scramble: string): string[] {
  return scramble.trim().split(/\s+/).filter(Boolean)
}

type ScrambleAnimatorProps = {
  scramble: string
  event: string
}

export function ScrambleAnimator({ scramble, event }: ScrambleAnimatorProps) {
  const moves = useMemo(() => parseMoves(scramble), [scramble])
  const [step, setStep] = useState(moves.length)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(500)
  const [twistyReady, setTwistyReady] = useState<boolean | null>(null)

  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<HTMLElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const puzzle = PUZZLE_MAP[event]

  const partialScramble = useMemo(() => {
    if (step === 0) return ""
    return moves.slice(0, step).join(" ")
  }, [moves, step])

  useEffect(() => {
    let cancelled = false
    import("cubing/twisty")
      .then(() => {
        if (!cancelled) setTwistyReady(true)
      })
      .catch(() => {
        if (!cancelled) setTwistyReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setIsPlaying(false)
    setStep(moves.length)
  }, [moves.length, scramble])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !twistyReady || !puzzle) return

    const player = document.createElement("twisty-player")
    player.setAttribute("puzzle", puzzle)
    player.setAttribute("control-panel", "none")
    player.setAttribute("background", "none")
    player.setAttribute("tempo-scale", "2")
    player.setAttribute("alg", "")
    player.style.width = "100%"
    player.style.height = "280px"

    host.replaceChildren(player)
    playerRef.current = player

    return () => {
      if (host.contains(player)) {
        host.removeChild(player)
      }
      if (playerRef.current === player) {
        playerRef.current = null
      }
    }
  }, [puzzle, twistyReady])

  useEffect(() => {
    if (!playerRef.current) return
    playerRef.current.setAttribute("alg", partialScramble)
  }, [partialScramble])

  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setStep((prev) => {
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
  }, [isPlaying, moves.length, speed])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const handlePlayPause = useCallback(() => {
    if (step >= moves.length) {
      setStep(0)
      setIsPlaying(true)
      return
    }
    setIsPlaying((playing) => !playing)
  }, [moves.length, step])

  const handlePrev = useCallback(() => {
    setIsPlaying(false)
    setStep((value) => Math.max(0, value - 1))
  }, [])

  const handleNext = useCallback(() => {
    setIsPlaying(false)
    setStep((value) => Math.min(moves.length, value + 1))
  }, [moves.length])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setStep(0)
  }, [])

  const handleKeyDown = useCallback(
    (eventKey: React.KeyboardEvent) => {
      if (eventKey.key === "ArrowLeft") {
        eventKey.preventDefault()
        handlePrev()
      } else if (eventKey.key === "ArrowRight") {
        eventKey.preventDefault()
        handleNext()
      } else if (eventKey.key === " ") {
        eventKey.preventDefault()
        handlePlayPause()
      } else if (eventKey.key === "Home") {
        eventKey.preventDefault()
        handleReset()
      } else if (eventKey.key === "End") {
        eventKey.preventDefault()
        setIsPlaying(false)
        setStep(moves.length)
      }
    },
    [handleNext, handlePlayPause, handlePrev, handleReset, moves.length]
  )

  if (!puzzle) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Animation unavailable for this event.
      </p>
    )
  }

  if (twistyReady === false) {
    return (
      <p className="text-center text-xs text-muted-foreground">
        Animation unavailable in this browser.
      </p>
    )
  }

  return (
    <div className="space-y-2 outline-none" tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="flex justify-center">
        <div ref={hostRef} className="w-full max-w-xl min-h-[280px]" />
      </div>

      <div className="flex flex-wrap gap-1 justify-center px-2">
        {moves.map((move, index) => (
          <span
            key={`${move}-${index}`}
            className={cn(
              "text-xs font-mono px-1 py-0.5 rounded cursor-pointer transition-colors",
              index < step ? "bg-primary/20 text-foreground" : "text-muted-foreground",
              index === step - 1 && "bg-primary text-primary-foreground font-bold"
            )}
            onClick={() => {
              setIsPlaying(false)
              setStep(index + 1)
            }}
          >
            {move}
          </span>
        ))}
      </div>

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
          title="Previous move (left arrow)"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          title={isPlaying ? "Pause (space)" : "Play (space)"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={handleNext}
          disabled={step >= moves.length}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
          title="Next move (right arrow)"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>

        <select
          value={speed}
          onChange={(eventSelect) => setSpeed(Number(eventSelect.target.value))}
          className="h-7 text-xs bg-secondary/50 border border-border rounded px-1.5"
          title="Playback speed"
        >
          <option value={1000}>0.5x</option>
          <option value={500}>1x</option>
          <option value={250}>2x</option>
          <option value={125}>4x</option>
        </select>
      </div>

      <p className="text-center text-[10px] text-muted-foreground">
        {step} / {moves.length} moves
      </p>
    </div>
  )
}
