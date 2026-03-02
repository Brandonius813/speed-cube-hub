"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  connectGanTimer,
  isBleSupported,
  type GanTimerConnection,
  type GanTimerEvent,
  type GanTimerStateCode,
} from "@/lib/timer/bluetooth"

export type BtConnectionStatus =
  | "unsupported"  // Browser has no Web Bluetooth API (Firefox, Safari, iOS)
  | "disconnected" // Supported but not currently connected
  | "connecting"   // requestDevice() picker open or GATT connecting
  | "connected"    // Fully connected, receiving events

export interface BtTimerCallbacks {
  /** Hands placed on mat (0x06 HANDS_ON) — show red/holding state */
  onHandsOn: () => void
  /** Grace period complete (0x01 GET_SET) — show green/ready state */
  onGetSet: () => void
  /** Premature hands-off before grace period (0x02 HANDS_OFF) — revert to idle */
  onHandsOff: () => void
  /** Hardware timer started counting (0x03 RUNNING) — begin display RAF loop */
  onRunning: () => void
  /** Hardware timer stopped (0x04 STOPPED) — record time from hardware */
  onStopped: (time_ms: number) => void
  /** BLE disconnected mid-session — abort any in-progress solve */
  onDisconnect: () => void
}

export interface UseBluetoothTimerReturn {
  btStatus: BtConnectionStatus
  /** Most recent GAN hardware state code (for status display when connected) */
  btState: GanTimerStateCode | null
  connect: () => Promise<void>
  disconnect: () => void
}

export function useBluetoothTimer(callbacks: BtTimerCallbacks): UseBluetoothTimerReturn {
  const [btStatus, setBtStatus] = useState<BtConnectionStatus>(() =>
    isBleSupported() ? "disconnected" : "unsupported"
  )
  const [btState, setBtState] = useState<GanTimerStateCode | null>(null)

  // Always-current callbacks — updated on every render to avoid stale closures.
  // The event handler reads from this ref so it always calls the current version
  // of addSolve and other functions that close over timer state.
  const callbacksRef = useRef<BtTimerCallbacks>(callbacks)
  callbacksRef.current = callbacks

  // Setter ref for btStatus — used inside the stable event handler below
  const setStatusRef = useRef(setBtStatus)
  setStatusRef.current = setBtStatus

  const connectionRef = useRef<GanTimerConnection | null>(null)

  const handleEvent = useCallback((evt: GanTimerEvent) => {
    const cb = callbacksRef.current
    setBtState(evt.state)

    switch (evt.state) {
      case "HANDS_ON":
        cb.onHandsOn()
        break

      case "GET_SET":
        // Grace period complete — show green (ready) state.
        cb.onGetSet()
        break

      case "HANDS_OFF":
        // Premature lift before grace period — tell the timer to revert to idle.
        cb.onHandsOff()
        break

      case "RUNNING":
        cb.onRunning()
        break

      case "STOPPED":
        if (evt.time_ms !== undefined) {
          cb.onStopped(evt.time_ms)
        }
        break

      case "IDLE":
      case "FINISHED":
        // Hardware reset or auto-transition — no action needed in the app.
        break

      case "DISCONNECT":
        setStatusRef.current("disconnected")
        setBtState(null)
        cb.onDisconnect()
        break
    }
  }, [])

  const connect = useCallback(async () => {
    if (!isBleSupported()) return
    setBtStatus("connecting")
    try {
      const conn = await connectGanTimer()
      conn.onEvent(handleEvent)
      connectionRef.current = conn
      setBtStatus("connected")
      setBtState(null)
    } catch {
      // User cancelled the picker or connection failed — quietly return to disconnected.
      setBtStatus("disconnected")
    }
  }, [handleEvent])

  const disconnect = useCallback(() => {
    connectionRef.current?.disconnect()
    connectionRef.current = null
    setBtStatus("disconnected")
    setBtState(null)
  }, [])

  // Clean up BLE connection when the component unmounts.
  useEffect(() => {
    return () => {
      connectionRef.current?.disconnect()
    }
  }, [])

  return { btStatus, btState, connect, disconnect }
}
