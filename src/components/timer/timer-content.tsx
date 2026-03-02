"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { generateScramble } from "@/lib/timer/scrambles"
import { useInspection } from "@/lib/timer/inspection"
import { cn } from "@/lib/utils"

type Penalty = "+2" | "DNF" | null
type Phase = "idle" | "holding" | "ready" | "inspecting" | "running" | "stopped"
type Solve = { id: string; time_ms: number; penalty: Penalty; scramble: string }

const HOLD_MS = 200

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
  return fmt(ms, 3) + (s.penalty === "+2" ? "+" : "")
}

function parseTime(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d+):)?(\d{1,2})(?:\.(\d{1,3}))?$/)
  if (!m) return null
  const total = (parseInt(m[1] ?? "0", 10) * 60 + parseInt(m[2], 10)) * 1000
    + parseInt((m[3] ?? "").padEnd(3, "0"), 10)
  return total > 0 ? total : null
}

function computeAo(solves: Solve[], n: number): number | null {
  if (solves.length < n) return null
  const times = solves.slice(-n).map((s) =>
    s.penalty === "DNF" ? Infinity : s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms
  )
  if (times.filter((t) => t === Infinity).length > 1) return null
  const trimmed = [...times].sort((a, b) => a - b).slice(1, -1)
  if (trimmed.some((t) => t === Infinity)) return null
  return Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
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

  const startRef = useRef(0)
  const rafRef = useRef(0)
  const phaseRef = useRef<Phase>("idle")
  const heldRef = useRef(false)
  const scrambleRef = useRef("")
  const eventRef = useRef("333")
  const inspOnRef = useRef(false)
  const inspRef = useRef<ReturnType<typeof useInspection> | null>(null)

  const insp = useInspection({ voice: true })

  // Sync all refs on every render so event handlers never have stale values
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
    const ms = Math.round(performance.now() - startRef.current)
    setElapsed(ms); setPhase("stopped"); addSolve(ms, null)
  }

  function startHold() {
    heldRef.current = true; setPhase("holding")
    setTimeout(() => { if (phaseRef.current === "holding" && heldRef.current) setPhase("ready") }, HOLD_MS)
  }

  function releaseHold() {
    if (phaseRef.current === "holding") { setPhase("idle"); return }
    if (phaseRef.current !== "ready") return
    if (inspOnRef.current) { setPhase("inspecting"); inspRef.current?.startInspection() }
    else startTimer()
  }

  function handlePress() {
    const p = phaseRef.current
    if (p === "running") { stopTimer(); return }
    if (p === "inspecting") {
      const pen = inspRef.current?.finishInspection() ?? null
      if (pen === "DNF") { addSolve(0, "DNF"); setPhase("stopped") } else startTimer()
      return
    }
    if (p === "idle" || p === "stopped") startHold()
  }

  // Auto-DNF when inspection expires
  useEffect(() => {
    if (insp.state === "done" && phaseRef.current === "inspecting") { addSolve(0, "DNF"); setPhase("stopped") }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insp.state])

  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || typing) return
      e.preventDefault(); handlePress()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typing) return
      e.preventDefault(); heldRef.current = false; releaseHold()
    }
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  function handlePointerDown(e: React.PointerEvent) {
    if (typing) return; e.preventDefault(); handlePress()
  }
  function handlePointerUp(e: React.PointerEvent) {
    if (typing) return; e.preventDefault(); heldRef.current = false; releaseHold()
  }

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

  const stats = useMemo(() => {
    const valid = solves.filter((s) => s.penalty !== "DNF").map((s) => s.penalty === "+2" ? s.time_ms + 2000 : s.time_ms)
    return { best: valid.length ? Math.min(...valid) : null, ao5: computeAo(solves, 5), ao12: computeAo(solves, 12) }
  }, [solves])

  const last = solves[solves.length - 1]

  function getDisplay(): string {
    if (phase === "running") return fmt(elapsed)
    if (phase === "ready") return "0.00"
    if (phase === "inspecting") return String(Math.max(0, insp.secondsLeft))
    if (last) return last.penalty === "DNF" ? "DNF" : fmt(last.penalty === "+2" ? last.time_ms + 2000 : last.time_ms, 3)
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

  return (
    <div
      className="flex flex-col items-center min-h-screen bg-background select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none" }}
    >
      {/* Top bar */}
      <div className="w-full max-w-xl flex items-center justify-between px-4 pt-4 pb-2 gap-2">
        <select
          className="bg-muted text-sm rounded px-2 py-1.5 border border-border text-foreground"
          value={event}
          onChange={(e) => changeEvent(e.target.value)}
          onPointerDown={sp}
        >
          {EVENTS.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <div className="flex gap-2" onPointerDown={sp}>
          <button className={tog("text-xs px-2 py-1 rounded border transition-colors", typing)} onClick={() => setTyping((t) => !t)}>
            ⌨ Type
          </button>
          <button className={tog("text-xs px-2 py-1 rounded border transition-colors", inspOn && !typing)} onClick={() => setInspOn((v) => !v)} disabled={typing}>
            Insp.
          </button>
        </div>
      </div>

      {/* Scramble */}
      <p className="w-full max-w-xl px-4 text-center text-sm font-mono text-muted-foreground leading-relaxed min-h-12 flex items-center justify-center">
        {scramble}
      </p>

      {/* Timer or typing input */}
      <div className="flex-1 flex items-center justify-center w-full px-4">
        {typing ? (
          <input
            type="text" inputMode="decimal" placeholder="0.00" value={typeVal} autoFocus
            onChange={(e) => setTypeVal(e.target.value)}
            onKeyDown={(e) => { if (e.key !== "Enter") return; const ms = parseTime(typeVal); if (ms) { addSolve(ms, null); setTypeVal("") } }}
            onPointerDown={sp}
            className="bg-transparent border-b-2 border-border text-center font-mono text-7xl w-full max-w-sm outline-none placeholder:text-muted-foreground/30"
          />
        ) : (
          <div className={cn("font-mono text-8xl font-light transition-colors duration-75 cursor-default", timeColor)}>
            {getDisplay()}
          </div>
        )}
      </div>

      {/* Penalty buttons */}
      {phase === "stopped" && last && (
        <div className="flex gap-3 py-2" onPointerDown={sp}>
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

      {/* Stats */}
      {solves.length > 0 && (
        <div className="w-full max-w-xl px-4 py-3 grid grid-cols-4 gap-2 border-t border-border text-center">
          {([["Best", stats.best !== null ? fmt(stats.best, 3) : "—"], ["Ao5", stats.ao5 !== null ? fmt(stats.ao5, 3) : "—"], ["Ao12", stats.ao12 !== null ? fmt(stats.ao12, 3) : "—"], ["Solves", String(solves.length)]] as const).map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="font-mono text-sm">{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Solve list */}
      {solves.length > 0 && (
        <div className="w-full max-w-xl px-4 pb-6 space-y-0.5 overflow-y-auto max-h-64">
          {[...solves].reverse().map((s, i) => (
            <div key={s.id} className="flex items-center text-sm min-w-0">
              <span className="w-7 shrink-0 text-right text-muted-foreground mr-2">{solves.length - i}.</span>
              {selectedId === s.id ? (
                <div className="flex items-center gap-1 flex-1 min-w-0" onPointerDown={sp}>
                  <span className="font-mono mr-1 shrink-0">{fmtSolve(s)}</span>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 shrink-0" onClick={() => setPenalty(s.id, s.penalty === "+2" ? null : "+2")}>+2</button>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0" onClick={() => setPenalty(s.id, s.penalty === "DNF" ? null : "DNF")}>DNF</button>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-destructive/20 text-destructive shrink-0" onClick={() => deleteSolve(s.id)}>Del</button>
                  <button className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0" onClick={() => setSelectedId(null)}>✕</button>
                </div>
              ) : (
                <button className="font-mono text-left hover:text-primary transition-colors" onPointerDown={sp} onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}>
                  {fmtSolve(s)}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
