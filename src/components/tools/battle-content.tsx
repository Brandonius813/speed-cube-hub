"use client"

import { useState, useEffect } from "react"
import { Swords, Loader2 } from "lucide-react"
import { useBattle } from "@/lib/battle/use-battle"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { BattlePlayer } from "@/lib/battle/battle-room"
import { BattleLobby, BattleWaiting } from "@/components/tools/battle-lobby"
import { BattleSolving } from "@/components/tools/battle-solving"
import { BattleRoundResult, BattleMatchResult } from "@/components/tools/battle-results"

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
