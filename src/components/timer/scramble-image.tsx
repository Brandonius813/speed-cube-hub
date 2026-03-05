"use client"

import { useEffect, useRef, useState } from "react"

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
}

export function ScrambleImage({ scramble, event }: ScrambleImageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [twistyReady, setTwistyReady] = useState<boolean | null>(null)

  const puzzle = PUZZLE_MAP[event]

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
    const host = hostRef.current
    if (!host || !twistyReady || !puzzle) return

    const player = document.createElement("twisty-player")
    player.setAttribute("puzzle", puzzle)
    player.setAttribute("alg", scramble)
    player.setAttribute("visualization", "2D")
    player.setAttribute("control-panel", "none")
    player.setAttribute("background", "none")
    player.style.width = "100%"
    player.style.height = "220px"

    host.replaceChildren(player)

    return () => {
      if (host.contains(player)) {
        host.removeChild(player)
      }
    }
  }, [puzzle, scramble, twistyReady])

  if (!puzzle) {
    return <p className="text-xs text-muted-foreground text-center">Scramble draw unavailable for this event.</p>
  }

  if (twistyReady === false) {
    return <p className="text-xs text-muted-foreground text-center">Scramble draw unavailable in this browser.</p>
  }

  return (
    <div className="flex justify-center">
      <div ref={hostRef} className="w-full max-w-xl min-h-[220px]" />
    </div>
  )
}
