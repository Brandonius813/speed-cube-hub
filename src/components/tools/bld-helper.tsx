"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Play, Square, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CORNER_STICKERS,
  EDGE_STICKERS,
  BUFFER_OPTIONS,
  FACE_COLORS,
  hasParity,
  parseMemo,
} from "@/lib/bld/letter-scheme"
import { generateScramble } from "@/lib/timer/scrambles"

type Tab = "scheme" | "memo" | "parity"

export function BLDHelper() {
  const [tab, setTab] = useState<Tab>("scheme")
  const [schemeView, setSchemeView] = useState<"corners" | "edges">("corners")

  // Buffer config
  const [cornerBuffer, setCornerBuffer] = useState("C")
  const [edgeBuffer, setEdgeBuffer] = useState("C")

  // Memo practice
  const [scramble, setScramble] = useState<string | null>(null)
  const [memoInput, setMemoInput] = useState("")
  const [memoTimer, setMemoTimer] = useState(0)
  const [isTiming, setIsTiming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Parity checker
  const [edgeMemo, setEdgeMemo] = useState("")
  const [cornerMemo, setCornerMemo] = useState("")

  const startMemoTimer = useCallback(() => {
    setIsTiming(true)
    setMemoTimer(0)
    if (timerRef.current) clearInterval(timerRef.current)
    const start = performance.now()
    timerRef.current = setInterval(() => {
      setMemoTimer(Math.floor((performance.now() - start) / 100) / 10)
    }, 100)
  }, [])

  const stopMemoTimer = useCallback(() => {
    setIsTiming(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleNewScramble = async () => {
    stopMemoTimer()
    setMemoInput("")
    const s = await generateScramble("333")
    setScramble(s)
    startMemoTimer()
  }

  const handleStopMemo = () => {
    stopMemoTimer()
  }

  const formatTimer = (t: number) => t.toFixed(1) + "s"

  const stickers = schemeView === "corners" ? CORNER_STICKERS : EDGE_STICKERS
  const bufferLetter = schemeView === "corners" ? cornerBuffer : edgeBuffer

  const edgePairs = parseMemo(edgeMemo)
  const cornerPairs = parseMemo(cornerMemo)
  const edgeHasParity = hasParity(edgeMemo)
  const cornerHasParity = hasParity(cornerMemo)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">BLD Helper</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Letter scheme reference, memo practice, and parity detection.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1">
        {(["scheme", "memo", "parity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 text-sm py-2 rounded-md transition-colors capitalize",
              tab === t
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "scheme" ? "Letter Scheme" : t === "memo" ? "Memo Practice" : "Parity Check"}
          </button>
        ))}
      </div>

      {/* Letter Scheme Tab */}
      {tab === "scheme" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={schemeView === "corners" ? "default" : "outline"}
              size="sm"
              onClick={() => setSchemeView("corners")}
            >
              Corners
            </Button>
            <Button
              variant={schemeView === "edges" ? "default" : "outline"}
              size="sm"
              onClick={() => setSchemeView("edges")}
            >
              Edges
            </Button>
          </div>

          {/* Buffer selector */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Buffer</label>
            <div className="flex gap-1 flex-wrap">
              {BUFFER_OPTIONS[schemeView === "corners" ? "corners" : "edges"].map((b) => (
                <button
                  key={b.letter}
                  onClick={() =>
                    schemeView === "corners"
                      ? setCornerBuffer(b.letter)
                      : setEdgeBuffer(b.letter)
                  }
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-md border transition-colors",
                    bufferLetter === b.letter
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-secondary"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sticker grid grouped by face */}
          <div className="space-y-3">
            {(["U", "L", "F", "R", "B", "D"] as const).map((face) => {
              const faceStickers = stickers.filter((s) => s.face === face)
              return (
                <div key={face} className="space-y-1">
                  <div className="text-xs text-muted-foreground font-medium">
                    {face} Face
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {faceStickers.map((s) => (
                      <div
                        key={s.letter + s.position}
                        className={cn(
                          "flex flex-col items-center justify-center w-12 h-12 rounded-md text-xs",
                          FACE_COLORS[face],
                          s.letter === bufferLetter && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        )}
                      >
                        <span className="font-bold text-sm">{s.letter}</span>
                        <span className="text-[9px] opacity-70">{s.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Memo Practice Tab */}
      {tab === "memo" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Generate a scramble and practice memorizing letter pairs. Time yourself to track improvement.
          </p>

          <Button onClick={handleNewScramble} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            New Scramble
          </Button>

          {scramble && (
            <div className="space-y-3">
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Scramble</p>
                <p className="font-mono text-sm leading-relaxed break-all">
                  {scramble}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="font-mono text-2xl tabular-nums font-bold">
                  {formatTimer(memoTimer)}
                </div>
                {isTiming ? (
                  <Button size="sm" variant="destructive" onClick={handleStopMemo} className="gap-1.5">
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={startMemoTimer} className="gap-1.5">
                    <Play className="h-3 w-3 fill-current" />
                    Start
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Edges memo</label>
                <Input
                  placeholder="e.g., AB CD EF GH..."
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value)}
                  className="font-mono text-sm"
                />
                {memoInput && (
                  <div className="flex gap-1.5 flex-wrap">
                    {parseMemo(memoInput).map((pair, i) => (
                      <span
                        key={i}
                        className={cn(
                          "font-mono text-xs px-2 py-1 rounded",
                          pair.length === 1
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-secondary/50"
                        )}
                      >
                        {pair}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!scramble && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Press &quot;New Scramble&quot; to start practicing memo.
            </div>
          )}
        </div>
      )}

      {/* Parity Check Tab */}
      {tab === "parity" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enter your edge and corner memo to check for parity. Odd number of targets = parity.
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Edge Memo</label>
              <Input
                placeholder="e.g., AB CD EF GH IJ"
                value={edgeMemo}
                onChange={(e) => setEdgeMemo(e.target.value)}
                className="font-mono text-sm"
              />
              {edgeMemo && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap flex-1">
                    {edgePairs.map((pair, i) => (
                      <span
                        key={i}
                        className={cn(
                          "font-mono text-xs px-2 py-1 rounded",
                          pair.length === 1
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-secondary/50"
                        )}
                      >
                        {pair}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {edgeMemo.replace(/[^a-zA-Z]/g, "").length} targets
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Corner Memo</label>
              <Input
                placeholder="e.g., AB CD EF"
                value={cornerMemo}
                onChange={(e) => setCornerMemo(e.target.value)}
                className="font-mono text-sm"
              />
              {cornerMemo && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-wrap flex-1">
                    {cornerPairs.map((pair, i) => (
                      <span
                        key={i}
                        className={cn(
                          "font-mono text-xs px-2 py-1 rounded",
                          pair.length === 1
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-secondary/50"
                        )}
                      >
                        {pair}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {cornerMemo.replace(/[^a-zA-Z]/g, "").length} targets
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Parity result */}
          {(edgeMemo || cornerMemo) && (
            <div className="space-y-2">
              {edgeMemo && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    edgeHasParity
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-green-500/10 text-green-400"
                  )}
                >
                  {edgeHasParity ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    Edges: {edgeHasParity ? "Parity detected" : "No parity"} ({edgeMemo.replace(/[^a-zA-Z]/g, "").length} targets)
                  </span>
                </div>
              )}
              {cornerMemo && (
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                    cornerHasParity
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-green-500/10 text-green-400"
                  )}
                >
                  {cornerHasParity ? (
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  )}
                  <span>
                    Corners: {cornerHasParity ? "Parity detected" : "No parity"} ({cornerMemo.replace(/[^a-zA-Z]/g, "").length} targets)
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="bg-secondary/20 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/80">How parity works:</p>
            <p>In BLD, parity occurs when the number of edge targets is odd. This means you need an extra algorithm (usually a parity alg) during execution.</p>
            <p>Corner parity is always opposite to edge parity — if edges have parity, corners do too (and vice versa).</p>
          </div>
        </div>
      )}
    </div>
  )
}
