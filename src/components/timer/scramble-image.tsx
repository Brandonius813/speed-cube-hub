"use client"

import { useMemo } from "react"
import { getImage } from "cstimer_module"

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

type ScrambleImageProps = {
  scramble: string
  event: string
}

export function ScrambleImage({ scramble, event }: ScrambleImageProps) {
  const svgString = useMemo(() => {
    const csType = CSTIMER_TYPE_MAP[event]
    if (!csType) return null
    try {
      return getImage(scramble, csType)
    } catch {
      return null
    }
  }, [scramble, event])

  if (!svgString) return null

  return (
    <div
      className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  )
}
