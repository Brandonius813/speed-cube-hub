import { ImageResponse } from "@vercel/og"
import { type NextRequest } from "next/server"

export const runtime = "edge"

// WCA event ID to label mapping (duplicated here since this is an edge route
// and cannot import from the main constants file reliably)
const EVENT_LABELS: Record<string, string> = {
  "222": "2x2",
  "333": "3x3",
  "444": "4x4",
  "555": "5x5",
  "666": "6x6",
  "777": "7x7",
  "333bf": "3x3 BLD",
  "444bf": "4x4 BLD",
  "555bf": "5x5 BLD",
  "333mbf": "Multi-BLD",
  "333oh": "3x3 OH",
  minx: "Megaminx",
  pyram: "Pyraminx",
  clock: "Clock",
  skewb: "Skewb",
  sq1: "Square-1",
  "333fm": "FMC",
}

function formatTime(seconds: number, eventId?: string): string {
  if (eventId === "333fm") return `${Math.round(seconds)}`
  if (seconds >= 60) {
    const min = Math.floor(seconds / 60)
    const sec = (seconds % 60).toFixed(2)
    return `${min}:${sec.padStart(5, "0")}`
  }
  return `${seconds.toFixed(2)}s`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const type = searchParams.get("type") || "session" // "session" | "pb"
  const name = searchParams.get("name") || "Cuber"
  const event = searchParams.get("event") || "333"
  const time = searchParams.get("time") // decimal seconds as string
  const solves = searchParams.get("solves")
  const handle = searchParams.get("handle") || ""

  const eventLabel = EVENT_LABELS[event] || event
  const isPB = type === "pb"

  // Main stat: either the time or the solve count
  const mainStat = time ? formatTime(parseFloat(time), event) : solves ? `${solves} solves` : ""
  const subtitle = isPB ? "New Personal Best!" : "Practice Session"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0A0A0F",
          padding: "60px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background accent glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Top row: type label + branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Type badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: isPB ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.08)",
              borderRadius: "24px",
              padding: "8px 20px",
              border: isPB ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span
              style={{
                fontSize: "20px",
                color: isPB ? "#818CF8" : "#A1A1AA",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              {subtitle}
            </span>
          </div>

          {/* Branding */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {/* Cube icon (simple SVG square) */}
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                backgroundColor: "#6366F1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  border: "2px solid white",
                  borderRadius: "2px",
                  display: "flex",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#A1A1AA",
                letterSpacing: "-0.02em",
              }}
            >
              SpeedCubeHub
            </span>
          </div>
        </div>

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: "16px",
          }}
        >
          {/* Event label */}
          <div
            style={{
              fontSize: "32px",
              color: "#71717A",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {eventLabel}
          </div>

          {/* Main stat */}
          <div
            style={{
              fontSize: "80px",
              fontWeight: 800,
              color: "#F1F1F4",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
            }}
          >
            {isPB && (
              <span
                style={{
                  fontSize: "48px",
                  color: "#6366F1",
                }}
              >
                PB
              </span>
            )}
            <span
              style={{
                fontFamily: "monospace",
              }}
            >
              {mainStat}
            </span>
          </div>

          {/* Solves count for session type (when time is also provided) */}
          {!isPB && solves && time && (
            <div
              style={{
                fontSize: "24px",
                color: "#71717A",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span>{solves} solves</span>
              <span style={{ color: "#3F3F46" }}>|</span>
              <span>avg {formatTime(parseFloat(time), event)}</span>
            </div>
          )}
        </div>

        {/* Bottom: user info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "24px",
          }}
        >
          {/* User avatar placeholder */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(99,102,241,0.2)",
              border: "2px solid rgba(99,102,241,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              fontWeight: 700,
              color: "#818CF8",
            }}
          >
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#F1F1F4",
                letterSpacing: "-0.01em",
              }}
            >
              {name}
            </span>
            {handle && (
              <span
                style={{
                  fontSize: "16px",
                  color: "#71717A",
                  fontWeight: 500,
                }}
              >
                @{handle}
              </span>
            )}
          </div>

          {/* URL at bottom-right */}
          <div
            style={{
              marginLeft: "auto",
              fontSize: "16px",
              color: "#3F3F46",
              fontWeight: 500,
            }}
          >
            speedcubehub.com
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
