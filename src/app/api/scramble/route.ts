import { type NextRequest, NextResponse } from "next/server"
import { generateSquare1Scramble } from "@/lib/timer/square1"

// Valid WCA event IDs (duplicated to avoid importing client-side constants)
const VALID_EVENTS = new Set([
  "222", "333", "444", "555", "666", "777",
  "333bf", "444bf", "555bf", "333mbf", "333oh", "333fm",
  "minx", "pyram", "clock", "skewb", "sq1",
])

// Map our event IDs to cubing.js event IDs
const CUBING_EVENT_MAP: Record<string, string> = {
  "222": "222",
  "333": "333",
  "444": "444",
  "555": "555",
  "666": "666",
  "777": "777",
  "333bf": "333bf",
  "444bf": "444bf",
  "555bf": "555bf",
  "333mbf": "333",
  "333oh": "333",
  "333fm": "333",
  minx: "minx",
  pyram: "pyram",
  clock: "clock",
  skewb: "skewb",
  sq1: "sq1",
}

export async function GET(request: NextRequest) {
  const event = request.nextUrl.searchParams.get("event")

  if (!event || !VALID_EVENTS.has(event)) {
    return NextResponse.json(
      { error: "Invalid or missing event parameter" },
      { status: 400 }
    )
  }

  const cubingEventId = CUBING_EVENT_MAP[event]
  if (!cubingEventId) {
    return NextResponse.json(
      { error: "Unsupported event" },
      { status: 400 }
    )
  }

  try {
    if (event === "sq1") {
      return NextResponse.json({ scramble: generateSquare1Scramble() })
    }

    const { randomScrambleForEvent } = await import("cubing/scramble")
    const scramble = await randomScrambleForEvent(cubingEventId)
    return NextResponse.json({ scramble: scramble.toString() })
  } catch (err) {
    console.error("cubing.js scramble generation failed:", err)
    return NextResponse.json(
      { error: "Scramble generation failed" },
      { status: 500 }
    )
  }
}
