import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { WCA_EVENTS } from "@/lib/constants"
import type { ParseResult, NormalizedSolve, NormalizedPB } from "@/lib/import/types"

const SYSTEM_PROMPT = `You are a data extraction assistant for a Rubik\u0027s cube timer app called Speed Cube Hub. Your job is to parse timer exports, spreadsheets, and pasted text containing cubing solve times or personal bests.

Analyze the data and return a JSON object with this exact structure:
{
  "dataType": "solves" | "pbs" | "mixed",
  "detectedEvent": "<WCA event ID or null>",
  "solves": [
    {
      "time_seconds": <number or null if DNF>,
      "date": "<YYYY-MM-DD>",
      "is_dnf": <boolean>,
      "penalty": "+2" or null,
      "scramble": "<string or null>"
    }
  ],
  "pbs": [
    {
      "event": "<WCA event ID>",
      "pb_type": "<Single, Ao5, Ao12, Mo3, etc.>",
      "time_seconds": <number>,
      "date_achieved": "<YYYY-MM-DD>"
    }
  ],
  "errors": ["<any issues found>"],
  "needsEventSelection": <boolean - true if event couldn\u0027t be determined>
}

Valid WCA event IDs: 333, 222, 444, 555, 666, 777, 333bf, 333fm, 333oh, clock, minx, pyram, skewb, sq1, 444bf, 555bf, 333mbf

Rules:
- Times in "m:ss.cc" format (e.g. "1:23.45") = convert to seconds (83.45)
- Times in milliseconds (e.g. "12345") = convert to seconds (12.345)
- Times already in seconds (e.g. "12.34") = keep as-is
- "DNF" or "DNF(12.34)" = is_dnf: true, time_seconds: 12.34 or null
- "+2" penalties: mark penalty: "+2", time should include the +2 already
- If the data looks like personal bests (best times per event), use the "pbs" array
- If the data looks like individual solve times, use the "solves" array
- If you can detect the event (e.g. "3x3" in the data), set detectedEvent
- If dates are missing, use "2024-01-01" as a fallback
- Return ONLY the JSON object, no other text`

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI parsing is not configured. Please contact support." },
      { status: 500 }
    )
  }

  let body: { text?: string; fileName?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const text = body.text?.trim()
  if (!text) {
    return NextResponse.json({ error: "No data provided" }, { status: 400 })
  }

  // Truncate to 50KB for safety
  const truncated = text.slice(0, 50_000)
  const userMessage = body.fileName
    ? `File name: ${body.fileName}\n\nContent:\n${truncated}`
    : truncated

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    })

    if (!resp.ok) {
      console.error("Anthropic API error:", resp.status, await resp.text())
      return NextResponse.json(
        { error: "AI parsing failed. Please try again." },
        { status: 500 }
      )
    }

    const message = await resp.json()

    // Extract text from response
    const responseText = (
      message.content as Array<{ type: string; text?: string }>
    )
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("")

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI could not parse the data. Please try a different format." },
        { status: 422 }
      )
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid data. Please try again." },
        { status: 422 }
      )
    }

    // Validate and build ParseResult
    const validEventIds = new Set<string>(WCA_EVENTS.map((e) => e.id))

    const solves: NormalizedSolve[] = []
    if (Array.isArray(parsed.solves)) {
      for (const s of parsed.solves) {
        if (typeof s !== "object" || s === null) continue
        const solve = s as Record<string, unknown>
        const timeSeconds =
          typeof solve.time_seconds === "number" ? solve.time_seconds : null
        const date =
          typeof solve.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(solve.date)
            ? solve.date
            : "2024-01-01"
        solves.push({
          time_seconds: timeSeconds,
          date,
          is_dnf: solve.is_dnf === true,
          penalty: solve.penalty === "+2" ? "+2" : null,
          scramble: typeof solve.scramble === "string" ? solve.scramble : null,
        })
      }
    }

    const pbsRaw: NormalizedPB[] = []
    if (Array.isArray(parsed.pbs)) {
      for (const p of parsed.pbs) {
        if (typeof p !== "object" || p === null) continue
        const pb = p as Record<string, unknown>
        if (
          typeof pb.event === "string" &&
          validEventIds.has(pb.event) &&
          typeof pb.time_seconds === "number" &&
          typeof pb.pb_type === "string"
        ) {
          pbsRaw.push({
            event: pb.event,
            pb_type: pb.pb_type,
            time_seconds: pb.time_seconds,
            date_achieved:
              typeof pb.date_achieved === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(pb.date_achieved)
                ? pb.date_achieved
                : "2024-01-01",
          })
        }
      }
    }

    const detectedEvent =
      typeof parsed.detectedEvent === "string" &&
      validEventIds.has(parsed.detectedEvent)
        ? parsed.detectedEvent
        : null

    const dataType =
      parsed.dataType === "pbs"
        ? "pbs"
        : parsed.dataType === "mixed"
          ? "mixed"
          : "solves"

    const result: ParseResult = {
      dataType,
      source: "AI",
      detectedEvent,
      solves,
      pbs: pbsRaw,
      errors: Array.isArray(parsed.errors)
        ? parsed.errors.filter((e): e is string => typeof e === "string")
        : [],
      needsEventSelection:
        parsed.needsEventSelection === true ||
        (!detectedEvent && solves.length > 0),
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("AI parsing error:", err)
    return NextResponse.json(
      { error: "AI parsing failed. Please try again." },
      { status: 500 }
    )
  }
}
