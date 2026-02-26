/**
 * Battle Room — Supabase Realtime
 *
 * Ephemeral multiplayer rooms using Supabase Realtime Broadcast + Presence.
 * No database tables needed — rooms exist only while players are connected.
 *
 * Flow:
 * 1. Host creates room → generates room code + scramble seed
 * 2. Opponent joins with room code → sees same scrambles via shared seed
 * 3. Both players solve → times broadcast in real-time
 * 4. First to finish wins the round → next scramble auto-loads
 */

import { getSupabaseClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export type BattlePlayer = {
  userId: string
  displayName: string
  avatarUrl?: string
}

export type BattleRoundResult = {
  oderId: string
  timeMs: number
  penalty: "+2" | "DNF" | null
  scrambleIndex: number
}

export type BattleRoomState = {
  roomCode: string
  hostId: string
  eventId: string
  seed: string
  scrambleIndex: number
  bestOf: number
  status: "waiting" | "ready" | "solving" | "round_complete" | "match_complete"
}

export type BattlePresence = BattlePlayer & {
  ready: boolean
  currentTime: number | null
  wins: number
  lastResult: BattleRoundResult | null
}

type BattleCallbacks = {
  onPlayersChange: (players: BattlePresence[]) => void
  onRoomStateChange: (state: BattleRoomState) => void
  onRoundStart: (scrambleIndex: number) => void
  onOpponentResult: (result: BattleRoundResult) => void
  onError: (message: string) => void
}

const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

export function generateRoomCode(): string {
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)]
  }
  return code
}

export class BattleRoom {
  private channel: RealtimeChannel | null = null
  private callbacks: BattleCallbacks
  private player: BattlePlayer
  private roomState: BattleRoomState | null = null

  constructor(player: BattlePlayer, callbacks: BattleCallbacks) {
    this.player = player
    this.callbacks = callbacks
  }

  /** Create a new room as host */
  create(eventId: string, bestOf: number): string {
    const roomCode = generateRoomCode()
    const seed = generateRoomCode() + generateRoomCode() // 8-char seed

    this.roomState = {
      roomCode,
      hostId: this.player.userId,
      eventId,
      seed,
      scrambleIndex: 0,
      bestOf,
      status: "waiting",
    }

    this.joinChannel(roomCode)
    return roomCode
  }

  /** Join an existing room */
  join(roomCode: string) {
    this.joinChannel(roomCode.toUpperCase())
  }

  private joinChannel(roomCode: string) {
    const supabase = getSupabaseClient()

    this.channel = supabase.channel(`battle:${roomCode}`, {
      config: { presence: { key: this.player.userId } },
    })

    // Presence: track who's in the room
    this.channel.on("presence", { event: "sync" }, () => {
      if (!this.channel) return
      const state = this.channel.presenceState<BattlePresence>()
      const players: BattlePresence[] = []
      for (const key of Object.keys(state)) {
        const entries = state[key]
        if (entries && entries.length > 0) {
          players.push(entries[0])
        }
      }
      this.callbacks.onPlayersChange(players)
    })

    // Broadcast: room state updates from host
    this.channel.on("broadcast", { event: "room_state" }, ({ payload }) => {
      this.roomState = payload as BattleRoomState
      this.callbacks.onRoomStateChange(this.roomState)
    })

    // Broadcast: round start signal
    this.channel.on("broadcast", { event: "round_start" }, ({ payload }) => {
      const { scrambleIndex } = payload as { scrambleIndex: number }
      this.callbacks.onRoundStart(scrambleIndex)
    })

    // Broadcast: opponent solve result
    this.channel.on("broadcast", { event: "solve_result" }, ({ payload }) => {
      const result = payload as BattleRoundResult
      if (result.oderId !== this.player.userId) {
        this.callbacks.onOpponentResult(result)
      }
    })

    this.channel
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // Track presence
          await this.channel?.track({
            userId: this.player.userId,
            displayName: this.player.displayName,
            avatarUrl: this.player.avatarUrl,
            ready: false,
            currentTime: null,
            wins: 0,
            lastResult: null,
          } satisfies BattlePresence)

          // If host, broadcast initial room state
          if (this.roomState?.hostId === this.player.userId) {
            this.broadcastRoomState()
          }
        } else if (status === "CHANNEL_ERROR") {
          this.callbacks.onError("Failed to connect to battle room")
        }
      })
  }

  /** Update own presence (ready state, current time, wins) */
  async updatePresence(update: Partial<BattlePresence>) {
    if (!this.channel) return
    await this.channel.track({
      userId: this.player.userId,
      displayName: this.player.displayName,
      avatarUrl: this.player.avatarUrl,
      ready: false,
      currentTime: null,
      wins: 0,
      lastResult: null,
      ...update,
    } satisfies BattlePresence)
  }

  /** Broadcast solve result to opponent */
  broadcastSolveResult(result: BattleRoundResult) {
    if (!this.channel) return
    this.channel.send({
      type: "broadcast",
      event: "solve_result",
      payload: result,
    })
  }

  /** Host: broadcast updated room state */
  broadcastRoomState() {
    if (!this.channel || !this.roomState) return
    this.channel.send({
      type: "broadcast",
      event: "room_state",
      payload: this.roomState,
    })
  }

  /** Host: start the next round */
  startRound(scrambleIndex: number) {
    if (!this.channel || !this.roomState) return
    this.roomState.scrambleIndex = scrambleIndex
    this.roomState.status = "solving"
    this.broadcastRoomState()
    this.channel.send({
      type: "broadcast",
      event: "round_start",
      payload: { scrambleIndex },
    })
  }

  /** Host: update room status */
  setStatus(status: BattleRoomState["status"]) {
    if (!this.roomState) return
    this.roomState.status = status
    this.broadcastRoomState()
  }

  getRoomState() {
    return this.roomState
  }

  isHost() {
    return this.roomState?.hostId === this.player.userId
  }

  /** Disconnect and cleanup */
  leave() {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.roomState = null
  }
}
