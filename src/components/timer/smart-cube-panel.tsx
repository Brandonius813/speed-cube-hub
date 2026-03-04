"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bluetooth, BluetoothOff, Battery, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SmartCubeConnection, isWebBluetoothAvailable, type SmartCubeMove } from "@/lib/timer/smart-cube"
import { cn } from "@/lib/utils"

type SmartCubePanelProps = {
  onMove?: (move: SmartCubeMove) => void
}

export function SmartCubePanel({ onMove }: SmartCubePanelProps) {
  const [connected, setConnected] = useState(false)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [battery, setBattery] = useState<number | null>(null)
  const [recentMoves, setRecentMoves] = useState<SmartCubeMove[]>([])
  const [moveCount, setMoveCount] = useState(0)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cubeRef = useRef<SmartCubeConnection | null>(null)
  const available = isWebBluetoothAvailable()

  useEffect(() => {
    const cube = new SmartCubeConnection()
    cubeRef.current = cube

    const unsubState = cube.onStateChange((state) => {
      if (state.connected !== undefined) setConnected(state.connected)
      if (state.deviceName !== undefined) setDeviceName(state.deviceName)
      if (state.battery !== undefined) setBattery(state.battery)
    })

    const unsubMove = cube.onMove((move) => {
      setRecentMoves((prev) => [...prev.slice(-19), move])
      setMoveCount((c) => c + 1)
      onMove?.(move)
    })

    return () => {
      unsubState()
      unsubMove()
      cube.disconnect()
    }
  }, [onMove])

  const handleConnect = useCallback(async () => {
    if (!cubeRef.current) return
    setIsConnecting(true)
    setError(null)
    try {
      const success = await cubeRef.current.connect()
      if (!success) setError("Connection cancelled or failed")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    }
    setIsConnecting(false)
  }, [])

  const handleDisconnect = useCallback(async () => {
    if (!cubeRef.current) return
    await cubeRef.current.disconnect()
    setRecentMoves([])
    setMoveCount(0)
  }, [])

  if (!available) {
    return (
      <div className="rounded-lg bg-secondary/30 p-3 text-center">
        <BluetoothOff className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          Web Bluetooth is not available in this browser.
          Try Chrome or Edge on desktop.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bluetooth className={cn("h-4 w-4", connected ? "text-blue-400" : "text-muted-foreground")} />
          <span className="text-sm font-medium">
            {connected ? deviceName ?? "Smart Cube" : "Smart Cube"}
          </span>
          {connected && battery !== null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Battery className="h-3 w-3" />
              {battery}%
            </span>
          )}
        </div>
        {connected ? (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            <Bluetooth className="h-3 w-3" />
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {connected && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>{moveCount} moves</span>
          </div>

          {recentMoves.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recentMoves.map((m, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-[10px] font-mono px-1 py-0.5 rounded",
                    i === recentMoves.length - 1
                      ? "bg-primary/20 text-foreground font-bold"
                      : "bg-secondary/50 text-muted-foreground"
                  )}
                >
                  {m.face}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
