"use client"

import {
  Swords,
  ArrowRight,
  LogOut,
  Trophy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getEventLabel } from "@/lib/constants"
import { formatTimeMs } from "@/lib/timer/averages"
import type { UseBattleReturn } from "@/lib/battle/use-battle"

export function BattleRoundResult({ battle }: { battle: UseBattleReturn }) {
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

export function BattleMatchResult({ battle }: { battle: UseBattleReturn }) {
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
