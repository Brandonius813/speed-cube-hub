"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { renderSquare1SvgFromScramble } from "@/lib/timer/square1"

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

type ScrambleImageProps = {
  scramble: string
  event: string
  size?: "md" | "lg" | "xl"
}

const SCRAMBLE_IMAGE_SCALE_CLASSES = {
  md: "scale-[0.72]",
  lg: "scale-[0.86]",
  xl: "scale-[1]",
} as const

function normalizeClockScramble(scramble: string): string {
  const tokens = scramble.trim().split(/\s+/)
  const normalized = tokens
    .map((token) => {
      if (token === "y2") return token

      // Legacy fallback pin-state tokens (UR0, DR1, etc.) are not valid in cubing.js clock algs.
      if (/^(UR|DR|DL|UL)[01]$/.test(token)) return ""

      // Legacy format: UR+5, D-3 -> normalize to UR5+, D3-
      const legacy = token.match(/^(UR|DR|DL|UL|U|R|D|L|ALL)([+-])(\d+)$/)
      if (legacy) {
        const amount = Math.min(11, Math.max(1, Number(legacy[3]) || 1))
        return `${legacy[1]}${amount}${legacy[2]}`
      }

      // Safety: clamp invalid 0 amounts in otherwise modern tokens (e.g. U0+).
      const modern = token.match(/^(UR|DR|DL|UL|U|R|D|L|ALL)(\d+)([+-])$/)
      if (modern) {
        const amount = Math.min(11, Math.max(1, Number(modern[2]) || 1))
        return `${modern[1]}${amount}${modern[3]}`
      }

      return token
    })
    .filter(Boolean)

  return normalized.join(" ")
}

export function ScrambleImage({
  scramble,
  event,
  size = "xl",
}: ScrambleImageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [twistyReady, setTwistyReady] = useState<boolean | null>(null)

  const puzzle = PUZZLE_MAP[event]
  const isSquare1 = event === "sq1"
  const visualScramble = event === "clock" ? normalizeClockScramble(scramble) : scramble
  const square1Svg = useMemo(() => {
    if (!isSquare1) return null
    try {
      return renderSquare1SvgFromScramble(scramble)
    } catch {
      return null
    }
  }, [isSquare1, scramble])

  useEffect(() => {
    if (isSquare1) return
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
  }, [isSquare1])

  useEffect(() => {
    const host = hostRef.current
    if (!host || isSquare1 || !twistyReady || !puzzle) return

    const player = document.createElement("twisty-player")
    player.setAttribute("puzzle", puzzle)
    player.setAttribute("alg", visualScramble)
    player.setAttribute("visualization", "2D")
    player.setAttribute("control-panel", "none")
    player.setAttribute("background", "none")
    player.style.width = "100%"
    player.style.height = "100%"

    host.replaceChildren(player)

    return () => {
      if (host.contains(player)) {
        host.removeChild(player)
      }
    }
  }, [isSquare1, puzzle, twistyReady, visualScramble])

  if (!puzzle) {
    return <p className="text-xs text-muted-foreground text-center">Scramble draw unavailable for this event.</p>
  }

  if (isSquare1) {
    if (!square1Svg) {
      return <p className="text-xs text-muted-foreground text-center">Invalid Square-1 scramble.</p>
    }

    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden">
        <div
          className={cn(
            "aspect-[5/3] h-full w-full max-h-full max-w-full origin-center transition-transform duration-150 [&_svg]:h-full [&_svg]:w-full",
            SCRAMBLE_IMAGE_SCALE_CLASSES[size]
          )}
          dangerouslySetInnerHTML={{ __html: square1Svg }}
        />
      </div>
    )
  }

  if (twistyReady === false) {
    return <p className="text-xs text-muted-foreground text-center">Scramble draw unavailable in this browser.</p>
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        ref={hostRef}
        className={cn(
          "aspect-[5/3] h-full w-full max-h-full max-w-full origin-center transition-transform duration-150",
          SCRAMBLE_IMAGE_SCALE_CLASSES[size]
        )}
      />
    </div>
  )
}
