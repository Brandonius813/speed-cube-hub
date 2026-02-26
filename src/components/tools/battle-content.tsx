"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Swords,
  Copy,
  Check,
  Crown,
  ArrowRight,
  LogOut,
  Users,
  Trophy,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WCA_EVENTS, getEventLabel } from "@/lib/constants"
import { useBattle, type BattlePhase } from "@/lib/battle/use-battle"
import { formatTimeMs } from "@/lib/timer/averages"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { BattlePlayer } from "@/lib/battle/battle-room"

const BATTLE_EVENTS = WCA_EVENTS.filter(
  (e) => !["333fm", "333mbf"].includes(e.id)
)
const BEST_OF_OPTIONS = [1, 3, 5, 7]

export function BattleContent() {
  const [player, setPlayer] = useState<BattlePlayer | null>(null)
  const [loading, setLoading] = useState(true)

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", user.id)
          .single()
        setPlayer({
          userId: user.id,
          displayName: profile
            ? `${profile.first_name} ${profile.last_name}`.trim()
            : "Anonymous",
          avatarUrl: profile?.avatar_url ?? undefined,
        })
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  const battle = useBattle(player)

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    )
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center space-y-4">
        <Swords className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold">Battle Mode</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to challenge friends to real-time cubing battles.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Battle Mode</h1>
        {battle.roomCode && (
          <span className="ml-auto text-xs text-muted-foreground">
            Room: <span className="font-mono font-bold text-foreground">{battle.roomCode}</span>
          </span>
        )}
      </div>

      {battle.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive">{battle.error}</p>
        </div>
      )}

      {battle.phase === "idle" && <BattleLobby battle={battle} />}
      {battle.phase === "lobby" && <BattleWaiting battle={battle} />}
      {battle.phase === "solving" && <BattleSolving battle={battle} />}
      {battle.phase === "round_result" && <BattleRoundResult battle={battle} />}
      {battle.phase === "match_result" && <BattleMatchResult battle={battle} />}
    </div>
  )
}

// === Lobby: Create or Join ===

function BattleLobby({ battle }: { battle: ReturnType<typeof useBattle> }) {
  const [mode, setMode] = useState<"create" | "join" | null>(null)
  const [eventId, setEventId] = useState("333")
  const [bestOf, setBestOf] = useState(3)
  const [joinCode, setJoinCode] = useState("")

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Challenge a friend to a real-time solving battle. Both players get the same scramble — fastest solver wins the round.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setMode("create")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            mode === "create"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <Crown className="h-5 w-5 text-primary mb-2" />
          <p className="font-medium text-sm">Create Room</p>
          <p className="text-xs text-muted-foreground mt-1">
            Host a battle and share the room code
          </p>
        </button>

        <button
          onClick={() => setMode("join")}
          className={cn(
            "rounded-xl border p-4 text-left transition-colors",
            mode === "join"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <Users className="h-5 w-5 text-primary mb-2" />
          <p className="font-medium text-sm">Join Room</p>
          <p className="text-xs text-muted-foreground mt-1">
            Enter a room code to join a battle
          </p>
        </button>
      </div>

      {mode === "create" && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Event
            </label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {BATTLE_EVENTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEventId(e.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                    eventId === e.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Best of
            </label>
            <div className="flex gap-2 mt-1.5">
              {BEST_OF_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setBestOf(n)}
                  className={cn(
                    "w-10 h-8 rounded-md text-sm font-medium transition-colors",
                    bestOf === n
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => battle.createRoom(eventId, bestOf)}
          >
            <Swords className="h-4 w-4 mr-2" />
            Create Battle Room
          </Button>
        </div>
      )}

      {mode === "join" && (
        <div className="space-y-4 rounded-xl border border-border p-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Room Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter 4-letter code"
              className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-center text-xl uppercase tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/50"
              maxLength={4}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && joinCode.length === 4) {
                  battle.joinRoom(joinCode)
                }
              }}
            />
          </div>

          <Button
            className="w-full"
            disabled={joinCode.length !== 4}
            onClick={() => battle.joinRoom(joinCode)}
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            Join Battle
          </Button>
        </div>
      )}
    </div>
  )
}

// === Waiting Room ===

function BattleWaiting({ battle }: { battle: ReturnType<typeof useBattle> }) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!battle.roomCode) return
    try {
      await navigator.clipboard.writeText(battle.roomCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const playerCount = battle.players.length
  const canStart = battle.isHost && playerCount >= 2

  return (
    <div className="space-y-6">
      {/* Room code display */}
      <div className="rounded-xl border border-border p-6 text-center space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Share this code with your opponent
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-4xl font-bold tracking-[0.3em]">
            {battle.roomCode}
          </span>
          <button
            onClick={copyCode}
            className="p-2 rounded-md hover:bg-secondary transition-colors"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <Copy className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        </div>
        {battle.roomState && (
          <p className="text-sm text-muted-foreground">
            {getEventLabel(battle.roomState.eventId)} · Best of {battle.roomState.bestOf}
          </p>
        )}
      </div>

      {/* Player list */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          Players ({playerCount}/2)
        </p>
        {battle.players.length === 0 ? (
          <div className="rounded-lg bg-secondary/30 p-4 text-center">
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Connecting...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {battle.players.map((p) => (
              <div
                key={p.userId}
                className="flex items-center gap-3 rounded-lg bg-secondary/30 px-4 py-3"
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {p.displayName[0]}
                  </div>
                )}
                <span className="text-sm font-medium flex-1">{p.displayName}</span>
                {battle.roomState?.hostId === p.userId && (
                  <Crown className="h-3.5 w-3.5 text-yellow-400" />
                )}
              </div>
            ))}
            {playerCount < 2 && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Waiting for opponent...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {canStart && (
          <Button className="flex-1" onClick={() => battle.startNextRound()}>
            <Swords className="h-4 w-4 mr-2" />
            Start Battle
          </Button>
        )}
        <Button variant="outline" onClick={battle.leaveRoom}>
          <LogOut className="h-4 w-4 mr-2" />
          Leave
        </Button>
      </div>
    </div>
  )
}

// === Active Solving ===

function BattleSolving({ battle }: { battle: ReturnType<typeof useBattle> }) {
  const [timerState, setTimerState] = useState<"idle" | "ready" | "running" | "stopped">("idle")
  const [displayMs, setDisplayMs] = useState(0)
  const startTimeRef = useRef(0)
  const rafRef = useRef(0)
  const holdStartRef = useRef(0)

  const roundNum = battle.scrambleIndex + 1
  const event = battle.roomState?.eventId ?? "333"

  // Timer loop
  const tick = useCallback(() => {
    if (startTimeRef.current > 0) {
      setDisplayMs(Date.now() - startTimeRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [])

  // Keyboard controls
  useEffect(() => {
    if (battle.myResult) return // already submitted

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat) return
      e.preventDefault()

      if (timerState === "idle") {
        holdStartRef.current = Date.now()
        setTimerState("ready")
      } else if (timerState === "running") {
        // Stop timer
        const elapsed = Date.now() - startTimeRef.current
        cancelAnimationFrame(rafRef.current)
        startTimeRef.current = 0
        setDisplayMs(elapsed)
        setTimerState("stopped")
        battle.submitResult(elapsed, null)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key !== " ") return
      e.preventDefault()

      if (timerState === "ready") {
        // Start timer
        const now = Date.now()
        startTimeRef.current = now
        setDisplayMs(0)
        setTimerState("running")
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [timerState, battle, tick])

  // Touch controls
  const handleTouchStart = useCallback(() => {
    if (battle.myResult) return
    if (timerState === "idle") {
      holdStartRef.current = Date.now()
      setTimerState("ready")
    } else if (timerState === "running") {
      const elapsed = Date.now() - startTimeRef.current
      cancelAnimationFrame(rafRef.current)
      startTimeRef.current = 0
      setDisplayMs(elapsed)
      setTimerState("stopped")
      battle.submitResult(elapsed, null)
    }
  }, [timerState, battle])

  const handleTouchEnd = useCallback(() => {
    if (battle.myResult) return
    if (timerState === "ready") {
      const now = Date.now()
      startTimeRef.current = now
      setDisplayMs(0)
      setTimerState("running")
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [timerState, tick])

  // Cleanup
  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Reset timer state when new round starts
  useEffect(() => {
    setTimerState("idle")
    setDisplayMs(0)
    startTimeRef.current = 0
    cancelAnimationFrame(rafRef.current)
  }, [battle.scrambleIndex])

  const opponent = battle.players.find(
    (p) => p.userId !== battle.roomState?.hostId
      ? p.userId
      : battle.players.find((q) => q.userId !== p.userId)?.userId
  )

  return (
    <div className="space-y-4">
      {/* Score bar */}
      <div className="flex items-center justify-center gap-6 text-center">
        <div>
          <p className="text-2xl font-bold font-mono">{battle.myWins}</p>
          <p className="text-[10px] text-muted-foreground">You</p>
        </div>
        <div className="text-xs text-muted-foreground">
          Round {roundNum}
          {battle.roomState && (
            <span className="block text-[10px]">{getEventLabel(event)}</span>
          )}
        </div>
        <div>
          <p className="text-2xl font-bold font-mono">{battle.opponentWins}</p>
          <p className="text-[10px] text-muted-foreground">Opp</p>
        </div>
      </div>

      {/* Scramble */}
      {battle.scramble && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Scramble</p>
          <p className="font-mono text-sm leading-relaxed break-all">{battle.scramble}</p>
        </div>
      )}

      {/* Timer area */}
      <div
        className="rounded-xl border border-border p-8 text-center select-none touch-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {battle.myResult ? (
          <div>
            <p className="font-mono text-4xl font-bold tabular-nums">
              {formatTimeMs(battle.myResult.timeMs)}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {battle.opponentResult
                ? "Both finished!"
                : "Waiting for opponent..."}
            </p>
          </div>
        ) : (
          <div>
            <p
              className={cn(
                "font-mono text-5xl font-bold tabular-nums transition-colors",
                timerState === "ready" && "text-green-400",
                timerState === "running" && "text-foreground",
                timerState === "idle" && "text-muted-foreground"
              )}
            >
              {timerState === "running" ? formatTimeMs(displayMs) : formatTimeMs(displayMs)}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              {timerState === "idle" && "Hold Space to start"}
              {timerState === "ready" && "Release to start!"}
              {timerState === "running" && "Press Space to stop"}
            </p>
          </div>
        )}
      </div>

      {/* Opponent status */}
      {battle.opponentResult && !battle.myResult && (
        <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
          <p className="text-sm text-yellow-400 font-medium">
            Opponent finished: {formatTimeMs(battle.opponentResult.timeMs)}
          </p>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={battle.leaveRoom}>
        <LogOut className="h-3.5 w-3.5 mr-1.5" />
        Leave Battle
      </Button>
    </div>
  )
}

// === Round Result ===

function BattleRoundResult({ battle }: { battle: ReturnType<typeof useBattle> }) {
  const myTime = battle.myResult?.timeMs ?? Infinity
  const opTime = battle.opponentResult?.timeMs ?? Infinity
  const myEffective = battle.myResult?.penalty === "DNF" ? Infinity : myTime
  const opEffective = battle.opponentResult?.penalty === "DNF" ? Infinity : opTime

  const iWon = myEffective < opEffective
  const tied = myEffective === opEffective
  const roundNum = battle.scrambleIndex + 1
  const bestOf = battle.roomState?.bestOf ?? 3

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex items-center justify-center gap-8 text-center">
        <div>
          <p className="text-3xl font-bold font-mono">{battle.myWins}</p>
          <p className="text-xs text-muted-foreground">You</p>
        </div>
        <span className="text-muted-foreground text-lg">—</span>
        <div>
          <p className="text-3xl font-bold font-mono">{battle.opponentWins}</p>
          <p className="text-xs text-muted-foreground">Opponent</p>
        </div>
      </div>

      {/* Round result */}
      <div className="rounded-xl border border-border p-6 text-center space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Round {roundNum} of {bestOf}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className={cn("rounded-lg p-4", iWon && "bg-green-500/10 border border-green-500/20")}>
            <p className="text-xs text-muted-foreground mb-1">You</p>
            <p className="font-mono text-xl font-bold tabular-nums">
              {formatTimeMs(myTime)}
            </p>
            {iWon && <Trophy className="h-4 w-4 text-green-400 mx-auto mt-1" />}
          </div>
          <div className={cn("rounded-lg p-4", !iWon && !tied && "bg-green-500/10 border border-green-500/20")}>
            <p className="text-xs text-muted-foreground mb-1">Opponent</p>
            <p className="font-mono text-xl font-bold tabular-nums">
              {formatTimeMs(opTime)}
            </p>
            {!iWon && !tied && <Trophy className="h-4 w-4 text-green-400 mx-auto mt-1" />}
          </div>
        </div>

        <p className={cn("text-sm font-medium", iWon ? "text-green-400" : tied ? "text-muted-foreground" : "text-red-400")}>
          {iWon ? "You won this round!" : tied ? "Tie!" : "Opponent wins this round"}
        </p>
      </div>

      <div className="flex gap-3">
        {battle.isHost && (
          <Button className="flex-1" onClick={battle.startNextRound}>
            Next Round
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
        {!battle.isHost && (
          <p className="flex-1 text-center text-sm text-muted-foreground py-2">
            Waiting for host to start next round...
          </p>
        )}
        <Button variant="outline" onClick={battle.leaveRoom}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// === Match Result ===

function BattleMatchResult({ battle }: { battle: ReturnType<typeof useBattle> }) {
  const won = battle.myWins > battle.opponentWins

  return (
    <div className="space-y-6 text-center">
      <div className="rounded-xl border border-border p-8 space-y-4">
        {won ? (
          <>
            <Trophy className="h-12 w-12 text-yellow-400 mx-auto" />
            <h2 className="text-2xl font-bold">You Win!</h2>
          </>
        ) : (
          <>
            <Swords className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-2xl font-bold">Opponent Wins</h2>
          </>
        )}

        <div className="flex items-center justify-center gap-8">
          <div>
            <p className="text-4xl font-bold font-mono">{battle.myWins}</p>
            <p className="text-xs text-muted-foreground">You</p>
          </div>
          <span className="text-muted-foreground text-xl">—</span>
          <div>
            <p className="text-4xl font-bold font-mono">{battle.opponentWins}</p>
            <p className="text-xs text-muted-foreground">Opponent</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {getEventLabel(battle.roomState?.eventId ?? "333")} · Best of {battle.roomState?.bestOf ?? 3}
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={battle.leaveRoom}>
          <ArrowRight className="h-4 w-4 mr-2" />
          New Battle
        </Button>
      </div>
    </div>
  )
}
