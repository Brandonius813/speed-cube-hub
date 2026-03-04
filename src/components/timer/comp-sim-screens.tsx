"use client"

import { Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompSimApi } from "@/components/timer/use-comp-sim"
import type { BackgroundNoise, Ao5Result, CompSimSolve } from "@/lib/timer/comp-sim-engine"

function fmtTime(ms: number): string {
  if (!isFinite(ms)) return "DNF"
  const s = ms / 1000
  if (s < 60) return s.toFixed(2)
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(2).padStart(5, "0")}`
}

const NOISE_OPTIONS: { value: BackgroundNoise; label: string }[] = [
  { value: "none", label: "None" },
  { value: "brown", label: "Brown Noise" },
  { value: "crowd", label: "Crowd" },
]

export function IdleScreen({ compSim }: { compSim: CompSimApi }) {
  const { snapshot } = compSim
  return (
    <div className="flex flex-col items-center gap-8 max-w-sm w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Competition Simulator</h2>
        <p className="text-sm text-muted-foreground">
          Simulates a WCA competition average of 5.
          You&apos;ll scramble, wait, then solve — just like the real thing.
        </p>
      </div>

      {/* Noise selector */}
      <div className="w-full">
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
          Background Noise
        </label>
        <div className="flex gap-2">
          {NOISE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => compSim.setBackgroundNoise(opt.value)}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                snapshot.backgroundNoise === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {opt.value === "none" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <VolumeX className="h-3.5 w-3.5" /> {opt.label}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" /> {opt.label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={compSim.startSim}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground text-lg font-semibold hover:bg-primary/90 transition-colors min-h-14"
      >
        Start Comp Sim
      </button>
    </div>
  )
}

export function ScrambleScreen({ compSim }: { compSim: CompSimApi }) {
  const { snapshot } = compSim
  const scramble = snapshot.scrambles[snapshot.solveIndex] ?? "Loading..."
  return (
    <div className="flex flex-col items-center gap-8 max-w-lg w-full">
      <div className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Solve {snapshot.solveIndex + 1} of 5
        </p>
        <p className="text-sm text-muted-foreground">Scramble your cube, then place it under the cover</p>
      </div>

      <p className="font-mono text-lg sm:text-xl text-center leading-relaxed px-2">
        {scramble}
      </p>

      <button
        onClick={compSim.confirmCubeCovered}
        className="w-full max-w-xs py-4 rounded-xl bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-colors min-h-14"
      >
        Cube is Under Cover
      </button>
    </div>
  )
}

export function WaitingScreen({ solveIndex }: { solveIndex: number }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-2xl font-medium text-muted-foreground">
        Waiting for solve {solveIndex + 1}
      </p>
      <p className="text-xs text-muted-foreground/60">
        Stay focused — the judge will call you soon
      </p>
    </div>
  )
}

export function CueScreen() {
  return (
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-green-500/40" />
      </div>
      <p className="text-3xl font-bold text-green-400">
        Time to Solve!
      </p>
    </div>
  )
}

export function InspectionScreen({
  secondsLeft,
  holdReady,
  holding,
  onPointerDown,
  onPointerUp,
}: {
  secondsLeft: number
  holdReady: boolean
  holding: boolean
  onPointerDown: () => void
  onPointerUp: () => void
}) {
  const display = Math.max(0, secondsLeft)
  const urgent = secondsLeft <= 3
  const warning = secondsLeft <= 7

  return (
    <div
      className="flex flex-col items-center gap-6 w-full cursor-pointer select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <p className="text-xs text-muted-foreground uppercase tracking-wider">
        Inspection
      </p>
      <p
        className={cn(
          "font-mono text-8xl sm:text-9xl font-bold tabular-nums transition-colors",
          holdReady ? "text-green-400" : holding ? "text-red-400" :
          urgent ? "text-red-400" : warning ? "text-yellow-400" : "text-foreground"
        )}
      >
        {display}
      </p>
      <p className="text-sm text-muted-foreground">
        {holdReady
          ? "Release to start!"
          : holding
            ? "Hold..."
            : "Hold spacebar to start"}
      </p>
    </div>
  )
}

export function SolvingScreen({
  displayRef,
  onPointerDown,
}: {
  displayRef: React.RefObject<HTMLDivElement | null>
  onPointerDown: () => void
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 w-full cursor-pointer select-none"
      onPointerDown={onPointerDown}
    >
      <div
        ref={displayRef}
        className="font-mono text-7xl sm:text-8xl font-bold tabular-nums text-foreground"
      >
        0.00
      </div>
      <p className="text-xs text-muted-foreground">
        Press spacebar or tap to stop
      </p>
    </div>
  )
}

export function SolveRecordedScreen({ solves }: { solves: CompSimSolve[] }) {
  const last = solves[solves.length - 1]
  if (!last) return null
  const display = last.penalty === "DNF"
    ? "DNF"
    : fmtTime(last.penalty === "+2" ? last.time_ms + 2000 : last.time_ms)

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-6xl sm:text-7xl font-bold tabular-nums text-foreground">
        {display}
      </p>
      {last.penalty === "+2" && (
        <span className="text-sm text-yellow-400 font-medium">+2 penalty</span>
      )}
      <p className="text-xs text-muted-foreground animate-pulse">
        Next solve coming up...
      </p>
    </div>
  )
}

export function ResultsScreen({
  compSim,
  ao5Result,
}: {
  compSim: CompSimApi
  ao5Result: Ao5Result | null
}) {
  if (!ao5Result) return null

  return (
    <div className="flex flex-col items-center gap-8 max-w-md w-full">
      <div className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {compSim.isSaving ? "Saving..." : "Saved!"}
        </p>
        <h2 className="text-2xl font-bold mb-1">
          Ao5: <span className="font-mono">{ao5Result.isDnf ? "DNF" : fmtTime(ao5Result.trimmedMeanMs!)}</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Attempt #{compSim.attemptNumber}
        </p>
      </div>

      {/* Individual times */}
      <div className="w-full space-y-2">
        {compSim.snapshot.solves.map((solve, i) => {
          const effective = solve.penalty === "DNF"
            ? Infinity
            : solve.penalty === "+2"
              ? solve.time_ms + 2000
              : solve.time_ms
          const isBest = i === ao5Result.bestIdx
          const isWorst = i === ao5Result.worstIdx
          const display = solve.penalty === "DNF"
            ? "DNF"
            : fmtTime(effective)

          return (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg",
                "bg-muted/50 border border-border"
              )}
            >
              <span className="text-sm text-muted-foreground">Solve {i + 1}</span>
              <span className={cn(
                "font-mono text-lg font-medium tabular-nums",
                solve.penalty === "DNF" && "text-red-400",
                solve.penalty === "+2" && "text-yellow-400"
              )}>
                {(isBest || isWorst) ? `(${display})` : display}
                {solve.penalty === "+2" && "+"}
              </span>
            </div>
          )
        })}
      </div>

      {/* Trimmed mean display line */}
      <p className="font-mono text-sm text-muted-foreground text-center">
        {ao5Result.display}
      </p>

      {/* Actions */}
      <div className="flex gap-3 w-full">
        <button
          onClick={compSim.goAgain}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors min-h-12"
        >
          Go Again
        </button>
        <button
          onClick={compSim.done}
          className="flex-1 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground font-medium transition-colors min-h-12"
        >
          Done
        </button>
      </div>
    </div>
  )
}
