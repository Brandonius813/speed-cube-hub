"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { generateScramble } from "@/lib/timer/scrambles"
import { useInspection } from "@/lib/timer/inspection"
import { cn } from "@/lib/utils"
import { type Penalty, type TimerSolve as Solve, STAT_OPTIONS, computeStat, bestStat } from "@/lib/timer/stats"

type Phase = "idle" | "holding" | "ready" | "inspecting" | "running" | "stopped"

const HOLD_MS = 550
const MILESTONES = [5, 12, 25, 50, 100, 200, 500, 1000]

const EVENTS = [
  { id: "333", name: "3x3" }, { id: "222", name: "2x2" }, { id: "444", name: "4x4" },
  { id: "555", name: "5x5" }, { id: "666", name: "6x6" }, { id: "777", name: "7x7" },
  { id: "333bf", name: "3BLD" }, { id: "333oh", name: "3OH" }, { id: "pyram", name: "Pyram" },
  { id: "skewb", name: "Skewb" }, { id: "clock", name: "Clock" },
  { id: "minx", name: "Megaminx" }, { id: "sq1", name: "SQ-1" },
]

function fmt(ms: number, dec = 2): string {
  const s = ms / 1000
  if (s < 60) return s.toFixed(dec)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(dec).padStart(dec + 3, "0")}`
}

function fmtSolve(s: Solve): string {
  if (s.penalty === "DNF") return "DNF"
  const ms = s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
  return fmt(ms) + (s.penalty === "+2" ? "+" : "")
}

// Accepts plain digits (e.g. "1234" → 12.34s) or M:SS / M:SS.cc format.
// If input contains a colon, parses explicitly as minutes:seconds[.centiseconds].
// Otherwise strips non-digits and reads right-to-left: last 2 = centiseconds,
// next 2 = seconds, remainder = minutes.
function parseTime(raw: string): number | null {
  if (raw.includes(":")) {
    const colonMatch = raw.trim().match(/^(\d+):(\d{1,2})(?:[.,](\d{1,2}))?$/)
    if (!colonMatch) return null
    const mins = parseInt(colonMatch[1], 10)
    const secs = parseInt(colonMatch[2], 10)
    const cs = parseInt((colonMatch[3] ?? "0").padEnd(2, "0"), 10)
    if (secs >= 60) return null
    const ms = (mins * 60 + secs) * 1000 + cs * 10
    return ms > 0 ? ms : null
  }
  const digits = raw.replace(/\D/g, "")
  if (!digits) return null
  const padded = digits.padStart(3, "0")
  const cs = parseInt(padded.slice(-2), 10)
  const rest = padded.slice(0, -2)
  const secs = parseInt(rest.slice(-2) || "0", 10)
  const mins = parseInt(rest.slice(0, -2) || "0", 10)
  if (secs >= 60) return null
  const ms = (mins * 60 + secs) * 1000 + cs * 10
  return ms > 0 ? ms : null
}

export function TimerContent() {
  const [event, setEvent] = useState("333")
  const [scramble, setScramble] = useState("")
  const [solves, setSolves] = useState<Solve[]>([])
  const [phase, setPhase] = useState<Phase>("idle")
  const [elapsed, setElapsed] = useState(0)
  const [inspOn, setInspOn] = useState(false)
  const [typing, setTyping] = useState(false)
  const [typeVal, setTypeVal] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scrambleCopied, setScrambleCopied] = useState(false)
  const [statCols, setStatCols] = useState<[string, string]>(() => {
    try { const s = localStorage.getItem("timer-stat-rows"); if (s) return JSON.parse(s) } catch {}
    return ["ao5", "ao12"]
  })

  const startRef = useRef(0)
  const rafRef = useRef(0)
  const phaseRef = useRef<Phase>("idle")
  const heldRef = useRef(false)
  const scrambleRef = useRef("")
  const eventRef = useRef("333")
  const inspOnRef = useRef(false)
  const inspRef = useRef<ReturnType<typeof useInspection> | null>(null)
  const inspHoldRef = useRef(false)   // true when holding spacebar during inspection to arm the timer
  const tapToInspectRef = useRef(false) // true when a tap from idle/stopped should start inspection on release

  const insp = useInspection({ voice: true })

  phaseRef.current = phase
  scrambleRef.current = scramble
  eventRef.current = event
  inspOnRef.current = inspOn
  inspRef.current = insp

  useEffect(() => { setScramble(generateScramble(event)) }, [event])

  useEffect(() => {
    if (phase !== "running") return
    const tick = () => { setElapsed(performance.now() - startRef.current); rafRef.current = requestAnimationFrame(tick) }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [phase])

  function addSolve(time_ms: number, penalty: Penalty) {
    setSolves((p) => [...p, { id: crypto.randomUUID(), time_ms, penalty, scramble: scrambleRef.current }])
    setScramble(generateScramble(eventRef.current))
    setSelectedId(null)
  }

  function startTimer() { setPhase("running"); setElapsed(0); startRef.current = performance.now() }

  function stopTimer() {
    cancelAnimationFrame(rafRef.current)
    const ms = Math.round((performance.now() - startRef.current) / 10) * 10
    setElapsed(ms); setPhase("stopped"); addSolve(ms, null)
  }

  function startHold() {
    heldRef.current = true; setPhase("holding")
    setTimeout(() => { if (phaseRef.current === "holding" && heldRef.current) setPhase("ready") }, HOLD_MS)
  }

  function releaseHold() {
    // tapToInspectRef is set synchronously in handlePress — no React state dependency
    if (tapToInspectRef.current) {
      tapToInspectRef.current = false
      setPhase("inspecting"); inspRef.current?.startInspection()
      return
    }
    // inspHoldRef is also synchronous — handle robustly regardless of phaseRef timing
    if (inspHoldRef.current) {
      inspHoldRef.current = false
      if (phaseRef.current === "ready") {
        // Stop inspection (silences voice alerts + returns any penalty) before starting timer
        const pen = inspRef.current?.finishInspection() ?? null
        if (pen === "DNF") { addSolve(0, "DNF"); setPhase("stopped") } else startTimer()
      } else {
        setPhase("inspecting") // released before 0.55s — return to inspection
      }
      return
    }
    // Regular hold path (no inspection involved)
    if (phaseRef.current === "holding") { setPhase("idle"); return }
    if (phaseRef.current !== "ready") return
    startTimer()
  }

  function handlePress() {
    const p = phaseRef.current
    if (p === "running") { stopTimer(); return }
    if (p === "inspecting") {
      inspHoldRef.current = true; tapToInspectRef.current = false; startHold(); return
    }
    if (p === "idle" || p === "stopped") {
      inspHoldRef.current = false
      if (inspOnRef.current) {
        // Tap spacebar to start inspection — flag is synchronous so release works instantly
        tapToInspectRef.current = true
        heldRef.current = true; setPhase("ready") // show green while held
      } else {
        tapToInspectRef.current = false; startHold()
      }
    }
  }

  useEffect(() => {
    // Also catch expiry while holding spacebar to arm the timer (inspHoldRef)
    if (insp.state === "done" && (phaseRef.current === "inspecting" || inspHoldRef.current)) {
      inspHoldRef.current = false; addSolve(0, "DNF"); setPhase("stopped")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insp.state])

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault() // always prevent spacebar scrolling, even on repeat
        if (e.repeat || typing) return
        handlePress()
        return
      }
      // Any non-space key stops the timer while running
      if (!typing && phaseRef.current === "running") stopTimer()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing) return
      e.preventDefault(); heldRef.current = false; releaseHold()
    }
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  function setPenalty(id: string, p: Penalty) {
    setSolves((prev) => prev.map((s) => (s.id === id ? { ...s, penalty: p } : s)))
    setSelectedId(null)
  }
  function deleteSolve(id: string) { setSolves((p) => p.filter((s) => s.id !== id)); setSelectedId(null) }

  function changeEvent(newEvent: string) {
    if (solves.length > 0 && !confirm("Switching events will clear your current session. Continue?")) return
    cancelAnimationFrame(rafRef.current); insp.cancelInspection()
    setEvent(newEvent); setSolves([]); setPhase("idle"); setElapsed(0)
  }
  function updateStatCol(idx: 0 | 1, key: string) {
    setStatCols((prev) => { const n: [string, string] = [prev[0], prev[1]]; n[idx] = key; localStorage.setItem("timer-stat-rows", JSON.stringify(n)); return n })
  }
  const stats = useMemo(() => {
    const valid = solves.filter((s) => s.penalty !== "DNF").map((s) => s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms)
    const mean = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
    // Auto-growing milestone rows: each appears once you have enough solves
    const milestoneRows = MILESTONES
      .filter((n) => solves.length >= n)
      .map((n) => { const key = `ao${n}`; return { key, cur: computeStat(solves, key), best: bestStat(solves, key) } })
    // Rolling averages at each solve position for the 4-column solve list
    const rolling1 = solves.map((_, i) => computeStat(solves.slice(0, i + 1), statCols[0]))
    const rolling2 = solves.map((_, i) => computeStat(solves.slice(0, i + 1), statCols[1]))
    return {
      best: valid.length ? Math.min(...valid) : null,
      mean,
      milestoneRows,
      rolling1,
      rolling2,
    }
  }, [solves, statCols])

  const last = solves[solves.length - 1]

  const inInspHold = (phase === "holding" || phase === "ready") && inspHoldRef.current

  function getDisplay(): string {
    if (phase === "running") return fmt(elapsed)
    if (phase === "inspecting" || inInspHold) return String(Math.max(0, 15 - insp.secondsLeft))
    if (phase === "ready") return "0.00"
    if (last) return last.penalty === "DNF" ? "DNF" : fmt(last.penalty === "+2" ? last.time_ms + 2000 : last.time_ms)
    return "0.00"
  }

  const timeColor =
    phase === "holding" ? "text-red-400" :
    phase === "ready" ? "text-green-400" :
    phase === "inspecting" && insp.secondsLeft <= 3 ? "text-red-400" :
    phase === "inspecting" && insp.secondsLeft <= 7 ? "text-yellow-400" :
    "text-foreground"

  const sp = (e: React.PointerEvent) => e.stopPropagation()
  const tog = (base: string, active: boolean) =>
    cn(base, active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")

  const D = (v: number | null) => v !== null ? fmt(v) : "—"

  return (
    <div
      className="flex flex-col min-h-screen bg-background select-none"
    >
      {/* Top bar — full width */}
      <div className="relative flex items-center px-4 py-4 gap-3 border-b border-border" onPointerDown={sp}>
        <select
          className="bg-muted text-sm rounded px-2 py-1.5 border border-border text-foreground shrink-0"
          value={event}
          onChange={(e) => changeEvent(e.target.value)}
        >
          {EVENTS.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <button
            className="text-center text-lg sm:text-xl font-mono font-bold text-white leading-snug line-clamp-2 hover:text-primary transition-colors cursor-pointer w-full"
            onClick={() => {
              navigator.clipboard.writeText(scramble).then(() => {
                setScrambleCopied(true)
                setTimeout(() => setScrambleCopied(false), 1500)
              })
            }}
            title="Click to copy scramble"
          >
            {scramble}
          </button>
        </div>
        {/* Scramble copied popup — absolutely positioned below top bar, no layout impact */}
        <span
          className={cn(
            "absolute top-full left-1/2 -translate-x-1/2 mt-2 text-xs text-green-400 font-mono transition-all duration-200 z-20 pointer-events-none",
            scrambleCopied ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          )}
        >
          Scramble copied!
        </span>
        <div className="flex gap-2 shrink-0">
          <button className={tog("text-xs px-2 py-1 rounded border transition-colors", typing)} onClick={() => setTyping((t) => !t)}>⌨ Type</button>
          <button className={tog("text-xs px-2 py-1 rounded border transition-colors", inspOn && !typing)} onClick={() => setInspOn((v) => !v)} disabled={typing}>Insp.</button>
        </div>
      </div>

      {/* Body: left panel + timer */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

        {/* Left panel: stats on top, solve list below — appears after timer on mobile */}
        <div className="w-full lg:w-56 xl:w-64 shrink-0 border-t lg:border-t-0 lg:border-r border-border flex flex-col order-last lg:order-first" onPointerDown={sp}>

          {/* Stats table — auto-grows as milestones are reached */}
          <div className="px-3 pt-3 pb-2 border-b border-border text-xs font-mono">
            <table className="w-full">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal pb-1"></th>
                  <th className="text-right font-normal pb-1 pr-2">cur</th>
                  <th className="text-right font-normal pb-1">best</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-muted-foreground py-0.5 pr-2">single</td>
                  <td className="text-right pr-2">{last ? fmtSolve(last) : "—"}</td>
                  <td className="text-right">{D(stats.best)}</td>
                </tr>
                {stats.milestoneRows.map((row) => (
                  <tr key={row.key}>
                    <td className="text-muted-foreground py-0.5 pr-2">{row.key}</td>
                    <td className="text-right pr-2">{D(row.cur)}</td>
                    <td className="text-right">{D(row.best)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between text-muted-foreground border-t border-border mt-2 pt-1.5">
              <span>count: {solves.length}</span>
              <span>mean: {D(stats.mean)}</span>
            </div>
          </div>

          {/* Solve list — 4-column grid: # | single | stat1 | stat2 */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-right pr-1.5 py-1.5 w-7 font-normal">#</th>
                  <th className="text-right pr-1.5 py-1.5 font-normal">single</th>
                  {([0, 1] as const).map((idx) => (
                    <th key={idx} className={cn("py-1 font-normal", idx === 0 ? "pr-1.5" : "pr-2")}>
                      <select
                        className="bg-transparent text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer border-none outline-none appearance-none w-full text-right"
                        value={statCols[idx]}
                        onChange={(e) => updateStatCol(idx, e.target.value)}
                        title="Click to change"
                      >
                        {STAT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...solves].reverse().map((s, i) => {
                  const idx = solves.length - 1 - i
                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="text-right pr-1.5 py-0.5 text-muted-foreground">{solves.length - i}</td>
                      {selectedId === s.id ? (
                        <>
                          <td className="text-right pr-1 py-0.5">{fmtSolve(s)}</td>
                          <td colSpan={2} className="py-0.5">
                            <div className="flex gap-0.5 justify-end pr-1.5">
                              <button className="px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-400 shrink-0" onClick={() => setPenalty(s.id, s.penalty === "+2" ? null : "+2")}>+2</button>
                              <button className="px-1 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0" onClick={() => setPenalty(s.id, s.penalty === "DNF" ? null : "DNF")}>DNF</button>
                              <button className="px-1 py-0.5 rounded bg-destructive/20 text-destructive shrink-0" onClick={() => deleteSolve(s.id)}>Del</button>
                              <button className="px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0" onClick={() => setSelectedId(null)}>✕</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="text-right pr-1.5 py-0.5">
                            <button className="hover:text-primary transition-colors w-full text-right" onClick={() => setSelectedId(s.id)}>{fmtSolve(s)}</button>
                          </td>
                          <td className="text-right pr-1.5 py-0.5 text-muted-foreground/70">{D(stats.rolling1[idx])}</td>
                          <td className="text-right pr-2 py-0.5 text-muted-foreground/70">{D(stats.rolling2[idx])}</td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timer display — fixed to true viewport center; pointer-events-none so touches fall through to the touch target below */}
        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          {typing ? (
            <div className="relative flex items-center justify-center w-full max-w-sm pointer-events-auto" onPointerDown={sp}>
              <input
                type="text" inputMode="numeric" placeholder="0000" value={typeVal} autoFocus
                onChange={(e) => setTypeVal(e.target.value)}
                onKeyDown={(e) => { if (e.key !== "Enter") return; const ms = parseTime(typeVal); if (ms) { addSolve(ms, null); setTypeVal("") } }}
                className="bg-transparent border-b-2 border-border text-center font-mono text-8xl font-light w-full outline-none placeholder:text-muted-foreground/30"
              />
              <p className="absolute top-full mt-2 text-sm font-mono text-muted-foreground h-5">
                {typeVal ? (parseTime(typeVal) !== null ? `= ${fmt(parseTime(typeVal)!)}` : "invalid") : ""}
              </p>
            </div>
          ) : (
            <div className={cn("font-mono text-8xl font-light transition-colors duration-75 cursor-default", timeColor)}>
              {getDisplay()}
            </div>
          )}

          {phase === "stopped" && last && (
            <div className="flex gap-3 py-3 pointer-events-auto" onPointerDown={sp}>
              <button
                className={cn("text-sm px-3 py-1.5 rounded border transition-colors", last.penalty === "+2" ? "bg-yellow-500 text-black border-yellow-500" : "border-border text-muted-foreground hover:border-yellow-500 hover:text-yellow-400")}
                onClick={() => setPenalty(last.id, last.penalty === "+2" ? null : "+2")}
              >+2</button>
              <button
                className={cn("text-sm px-3 py-1.5 rounded border transition-colors", last.penalty === "DNF" ? "bg-red-500 text-white border-red-500" : "border-border text-muted-foreground hover:border-red-500 hover:text-red-400")}
                onClick={() => setPenalty(last.id, last.penalty === "DNF" ? null : "DNF")}
              >DNF</button>
              <button
                className="text-sm px-3 py-1.5 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                onClick={() => { deleteSolve(last.id); setPhase("idle") }}
              >Delete</button>
            </div>
          )}
        </div>

        {/* Right: spacer to push timer display to center */}
        <div className="flex-1 order-first lg:order-last min-h-[60vh] lg:min-h-0" />

      </div>
    </div>
  )
}
