"use client"

import { useEffect, useRef, useState } from "react"
import { StackmatDecoder, type StackmatState, type StackmatPacket } from "@/lib/timer/stackmat"

export type UseStackmatOptions = {
  onSolveComplete: (timeMs: number) => void
  enabled: boolean
}

export type UseStackmatReturn = {
  isConnected: boolean
  isReceiving: boolean
  stackmatState: StackmatState
  currentTimeMs: number
  connect: () => Promise<void>
  disconnect: () => void
  isSupported: boolean
  error: string | null
}

export function useStackmat({ onSolveComplete, enabled }: UseStackmatOptions): UseStackmatReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isReceiving, setIsReceiving] = useState(false)
  const [stackmatState, setStackmatState] = useState<StackmatState>("idle")
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const decoderRef = useRef<StackmatDecoder | null>(null)
  const lastStoppedTimeRef = useRef<number>(0)
  const onSolveCompleteRef = useRef(onSolveComplete)
  onSolveCompleteRef.current = onSolveComplete

  const isSupported = typeof window !== "undefined" && StackmatDecoder.isSupported()

  const connect = async () => {
    if (decoderRef.current) {
      decoderRef.current.stop()
    }

    setError(null)
    const decoder = new StackmatDecoder({
      onStateChange: (state, timeMs) => {
        setStackmatState(state)
        setCurrentTimeMs(timeMs)

        if (state === "stopped" && timeMs > 0) {
          if (timeMs !== lastStoppedTimeRef.current) {
            lastStoppedTimeRef.current = timeMs
            onSolveCompleteRef.current(timeMs)
          }
        } else if (state === "idle" || state === "reset") {
          lastStoppedTimeRef.current = 0
        }
      },
      onPacket: (packet: StackmatPacket) => {
        setCurrentTimeMs(packet.timeMs)
        setStackmatState(packet.state)
        setIsReceiving(true)
      },
      onError: (message: string) => {
        setError(message)
        setIsConnected(false)
        setIsReceiving(false)
      },
    })

    decoderRef.current = decoder
    await decoder.start()
    setIsConnected(true)
  }

  const disconnect = () => {
    if (decoderRef.current) {
      decoderRef.current.stop()
      decoderRef.current = null
    }
    setIsConnected(false)
    setIsReceiving(false)
    setStackmatState("idle")
    setCurrentTimeMs(0)
    lastStoppedTimeRef.current = 0
  }

  // Auto-disconnect when disabled
  useEffect(() => {
    if (!enabled && isConnected) {
      disconnect()
    }
  }, [enabled, isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (decoderRef.current) {
        decoderRef.current.stop()
        decoderRef.current = null
      }
    }
  }, [])

  // Periodically check signal detection
  useEffect(() => {
    if (!isConnected || !decoderRef.current) return

    const interval = setInterval(() => {
      if (decoderRef.current) {
        setIsReceiving(decoderRef.current.isReceiving)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isConnected])

  return {
    isConnected,
    isReceiving,
    stackmatState,
    currentTimeMs,
    connect,
    disconnect,
    isSupported,
    error,
  }
}
