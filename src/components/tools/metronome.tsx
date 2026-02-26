"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Play, Square, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MIN_BPM = 20
const MAX_BPM = 300
const DEFAULT_BPM = 120

// Beep frequencies
const ACCENT_FREQ = 1000 // Hz for first beat of measure
const NORMAL_FREQ = 800 // Hz for other beats
const BEEP_DURATION = 0.05 // seconds

type MetronomeMode = "bpm" | "seconds"

export function Metronome() {
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [isPlaying, setIsPlaying] = useState(false)
  const [beat, setBeat] = useState(0)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [mode, setMode] = useState<MetronomeMode>("bpm")
  const [secondsInterval, setSecondsInterval] = useState(1)

  const audioContextRef = useRef<AudioContext | null>(null)
  const nextBeatTimeRef = useRef(0)
  const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const beatCountRef = useRef(0)

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const playBeep = useCallback(
    (time: number, isAccent: boolean) => {
      const ctx = getAudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.frequency.value = isAccent ? ACCENT_FREQ : NORMAL_FREQ
      osc.type = "sine"

      gain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, time)
      gain.gain.exponentialRampToValueAtTime(0.001, time + BEEP_DURATION)

      osc.start(time)
      osc.stop(time + BEEP_DURATION)
    },
    [getAudioContext]
  )

  const scheduleBeats = useCallback(() => {
    const ctx = getAudioContext()
    const intervalMs =
      mode === "bpm" ? 60000 / bpm : secondsInterval * 1000

    // Schedule beats slightly ahead for precise timing
    const lookAhead = 0.1 // seconds
    const scheduleInterval = 25 // ms

    const schedule = () => {
      while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
        const isAccent =
          mode === "bpm"
            ? beatCountRef.current % beatsPerMeasure === 0
            : true

        playBeep(nextBeatTimeRef.current, isAccent)

        const currentBeat = beatCountRef.current
        const beatTime = nextBeatTimeRef.current
        const ctxRef = ctx

        // Schedule UI update at the right time
        const delay = (beatTime - ctxRef.currentTime) * 1000
        setTimeout(() => {
          setBeat(currentBeat)
        }, Math.max(0, delay))

        nextBeatTimeRef.current += intervalMs / 1000
        beatCountRef.current++
      }

      timerIdRef.current = setTimeout(schedule, scheduleInterval)
    }

    schedule()
  }, [bpm, beatsPerMeasure, mode, secondsInterval, playBeep, getAudioContext])

  const handleStart = useCallback(() => {
    const ctx = getAudioContext()
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    beatCountRef.current = 0
    nextBeatTimeRef.current = ctx.currentTime
    setIsPlaying(true)
    setBeat(0)
  }, [getAudioContext])

  const handleStop = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current)
      timerIdRef.current = null
    }
    setIsPlaying(false)
    setBeat(0)
    beatCountRef.current = 0
  }, [])

  // Start/stop scheduling when isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      scheduleBeats()
    }
    return () => {
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = null
      }
    }
  }, [isPlaying, scheduleBeats])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current)
      if (audioContextRef.current) audioContextRef.current.close()
    }
  }, [])

  const adjustBpm = (delta: number) => {
    setBpm((prev) => Math.min(MAX_BPM, Math.max(MIN_BPM, prev + delta)))
  }

  const handleBpmChange = (value: string) => {
    const num = parseInt(value)
    if (isNaN(num)) return
    setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, num)))
  }

  const currentBeatInMeasure = mode === "bpm" ? beat % beatsPerMeasure : 0

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Metronome</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Practice with a consistent pace
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "bpm" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => { setMode("bpm"); if (isPlaying) handleStop() }}
        >
          BPM
        </Button>
        <Button
          variant={mode === "seconds" ? "default" : "outline"}
          size="sm"
          className="flex-1"
          onClick={() => { setMode("seconds"); if (isPlaying) handleStop() }}
        >
          Seconds
        </Button>
      </div>

      {mode === "bpm" ? (
        <>
          {/* BPM display */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => adjustBpm(-5)}
              disabled={bpm <= MIN_BPM}
            >
              <Minus className="h-4 w-4" />
            </Button>

            <div className="text-center">
              <input
                type="number"
                min={MIN_BPM}
                max={MAX_BPM}
                value={bpm}
                onChange={(e) => handleBpmChange(e.target.value)}
                className="w-24 text-center font-mono text-5xl font-bold bg-transparent border-none outline-none"
              />
              <p className="text-sm text-muted-foreground">BPM</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => adjustBpm(5)}
              disabled={bpm >= MAX_BPM}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* BPM slider */}
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={bpm}
            onChange={(e) => setBpm(parseInt(e.target.value))}
            className="w-full accent-primary"
          />

          {/* Quick BPM buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {[60, 80, 100, 120, 140, 160, 180].map((n) => (
              <button
                key={n}
                onClick={() => setBpm(n)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  bpm === n
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Beats per measure */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              Beats per measure
            </label>
            <div className="flex gap-2">
              {[2, 3, 4, 6, 8].map((n) => (
                <Button
                  key={n}
                  variant={beatsPerMeasure === n ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setBeatsPerMeasure(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {/* Beat indicators */}
          {isPlaying && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: beatsPerMeasure }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-4 w-4 rounded-full transition-all duration-100",
                    currentBeatInMeasure === i
                      ? i === 0
                        ? "bg-primary scale-125"
                        : "bg-foreground scale-110"
                      : "bg-secondary"
                  )}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Seconds mode */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">
              Beep every
            </label>
            <div className="flex flex-wrap gap-2">
              {[0.5, 1, 2, 3, 5, 10, 15, 30].map((n) => (
                <Button
                  key={n}
                  variant={secondsInterval === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSecondsInterval(n)}
                >
                  {n}s
                </Button>
              ))}
            </div>
          </div>

          {/* Seconds counter */}
          {isPlaying && (
            <div className="text-center">
              <p className="font-mono text-4xl font-bold">
                {(beat * secondsInterval).toFixed(secondsInterval < 1 ? 1 : 0)}s
              </p>
            </div>
          )}
        </>
      )}

      {/* Play/Stop button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full p-0"
          onClick={isPlaying ? handleStop : handleStart}
        >
          {isPlaying ? (
            <Square className="h-6 w-6 fill-current" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
