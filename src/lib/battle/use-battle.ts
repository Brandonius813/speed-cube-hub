"use client"

import { useState, useRef, useEffect } from "react"
import {
  BattleRoom,
  type BattlePlayer,
  type BattlePresence,
  type BattleRoomState,
  type BattleRoundResult,
} from "@/lib/battle/battle-room"
import { generateSeededScrambles } from "@/lib/timer/scrambles"

export type BattlePhase = "idle" | "lobby" | "solving" | "round_result" | "match_result"

export type BattleState = {
  phase: BattlePhase
  roomCode: string | null
  isHost: boolean
  players: BattlePresence[]
  roomState: BattleRoomState | null
  scramble: string | null
  scrambleIndex: number
  myResult: BattleRoundResult | null
  opponentResult: BattleRoundResult | null
  myWins: number
  opponentWins: number
  error: string | null
}

export type UseBattleReturn = BattleState & {
  createRoom: (eventId: string, bestOf: number) => void
  joinRoom: (roomCode: string) => void
  setReady: (ready: boolean) => void
  submitResult: (timeMs: number, penalty: "+2" | "DNF" | null) => void
  startNextRound: () => void
  leaveRoom: () => void
}

export function useBattle(player: BattlePlayer | null): UseBattleReturn {
  const [phase, setPhase] = useState<BattlePhase>("idle")
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState<BattlePresence[]>([])
  const [roomState, setRoomState] = useState<BattleRoomState | null>(null)
  const [scramble, setScramble] = useState<string | null>(null)
  const [scrambleIndex, setScrambleIndex] = useState(0)
  const [myResult, setMyResult] = useState<BattleRoundResult | null>(null)
  const [opponentResult, setOpponentResult] = useState<BattleRoundResult | null>(null)
  const [myWins, setMyWins] = useState(0)
  const [opponentWins, setOpponentWins] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const roomRef = useRef<BattleRoom | null>(null)
  const scramblesRef = useRef<string[]>([])
  const playerRef = useRef(player)
  playerRef.current = player
  const scrambleIndexRef = useRef(0)
  scrambleIndexRef.current = scrambleIndex

  function loadScramble(state: BattleRoomState, index: number) {
    if (scramblesRef.current.length <= index) {
      scramblesRef.current = generateSeededScrambles(
        state.eventId,
        state.seed,
        state.bestOf * 2 + 5
      )
    }
    setScramble(scramblesRef.current[index] ?? null)
    setScrambleIndex(index)
  }

  function handleRoomState(state: BattleRoomState) {
    setRoomState(state)
    if (state.status === "solving") {
      loadScramble(state, state.scrambleIndex)
      setPhase("solving")
      setMyResult(null)
      setOpponentResult(null)
    } else if (state.status === "waiting") {
      setPhase("lobby")
    }
  }

  function handleRoundStart(idx: number) {
    setPhase("solving")
    setMyResult(null)
    setOpponentResult(null)
    if (roomRef.current?.getRoomState()) {
      loadScramble(roomRef.current.getRoomState()!, idx)
    }
  }

  function createCallbacks() {
    return {
      onPlayersChange: setPlayers,
      onRoomStateChange: handleRoomState,
      onRoundStart: handleRoundStart,
      onOpponentResult: (result: BattleRoundResult) => setOpponentResult(result),
      onError: setError,
    }
  }

  function createRoom(eventId: string, bestOf: number) {
    if (!playerRef.current) return

    const room = new BattleRoom(playerRef.current, createCallbacks())
    const code = room.create(eventId, bestOf)
    roomRef.current = room
    setRoomCode(code)
    setIsHost(true)
    setPhase("lobby")
    setMyWins(0)
    setOpponentWins(0)
    scramblesRef.current = []
  }

  function joinRoom(code: string) {
    if (!playerRef.current) return

    const room = new BattleRoom(playerRef.current, createCallbacks())
    room.join(code)
    roomRef.current = room
    setRoomCode(code.toUpperCase())
    setIsHost(false)
    setPhase("lobby")
    setMyWins(0)
    setOpponentWins(0)
    scramblesRef.current = []
  }

  function setReady(ready: boolean) {
    roomRef.current?.updatePresence({ ready })
  }

  function submitResult(timeMs: number, penalty: "+2" | "DNF" | null) {
    if (!playerRef.current || !roomRef.current) return

    const result: BattleRoundResult = {
      oderId: playerRef.current.userId,
      timeMs: penalty === "+2" ? timeMs + 2000 : timeMs,
      penalty,
      scrambleIndex: scrambleIndexRef.current,
    }
    setMyResult(result)
    roomRef.current.broadcastSolveResult(result)
    roomRef.current.updatePresence({ currentTime: result.timeMs, lastResult: result })
  }

  function startNextRound() {
    if (!roomRef.current?.isHost()) return
    const nextIdx = scrambleIndexRef.current + 1
    roomRef.current.startRound(nextIdx)
  }

  function leaveRoom() {
    roomRef.current?.leave()
    roomRef.current = null
    setPhase("idle")
    setRoomCode(null)
    setIsHost(false)
    setPlayers([])
    setRoomState(null)
    setScramble(null)
    setScrambleIndex(0)
    setMyResult(null)
    setOpponentResult(null)
    setMyWins(0)
    setOpponentWins(0)
    setError(null)
    scramblesRef.current = []
  }

  // Check if round is complete when both results are in
  useEffect(() => {
    if (!myResult || !opponentResult) return
    if (phase !== "solving") return

    setPhase("round_result")

    const myEffective = myResult.penalty === "DNF" ? Infinity : myResult.timeMs
    const opEffective = opponentResult.penalty === "DNF" ? Infinity : opponentResult.timeMs

    if (myEffective < opEffective) {
      setMyWins((w) => w + 1)
    } else if (opEffective < myEffective) {
      setOpponentWins((w) => w + 1)
    }
  }, [myResult, opponentResult, phase])

  // Check for match completion
  useEffect(() => {
    if (phase !== "round_result" || !roomState) return
    const winsNeeded = Math.ceil(roomState.bestOf / 2)
    if (myWins >= winsNeeded || opponentWins >= winsNeeded) {
      setPhase("match_result")
      if (roomRef.current?.isHost()) {
        roomRef.current.setStatus("match_complete")
      }
    }
  }, [phase, myWins, opponentWins, roomState])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roomRef.current?.leave()
    }
  }, [])

  return {
    phase,
    roomCode,
    isHost,
    players,
    roomState,
    scramble,
    scrambleIndex,
    myResult,
    opponentResult,
    myWins,
    opponentWins,
    error,
    createRoom,
    joinRoom,
    setReady,
    submitResult,
    startNextRound,
    leaveRoom,
  }
}
