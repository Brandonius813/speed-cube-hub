"use client"

import { useState } from "react"
import {
  Swords,
  Copy,
  Check,
  Crown,
  ArrowRight,
  LogOut,
  Users,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WCA_EVENTS, getEventLabel } from "@/lib/constants"
import type { UseBattleReturn } from "@/lib/battle/use-battle"

const BATTLE_EVENTS = WCA_EVENTS.filter(
  (e) => !["333fm", "333mbf"].includes(e.id)
)
const BEST_OF_OPTIONS = [1, 3, 5, 7]

export function BattleLobby({ battle }: { battle: UseBattleReturn }) {
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

export function BattleWaiting({ battle }: { battle: UseBattleReturn }) {
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
