"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Box, Eye, EyeOff, X } from "lucide-react"
import { cn } from "@/lib/utils"

type PbPhotoModeOverlayProps = {
  eventLabel: string
  timeText: string
  scramble: string
  displayName: string
  handle: string | null
  onClose: () => void
}

export function PbPhotoModeOverlay({
  eventLabel,
  timeText,
  scramble,
  displayName,
  handle,
  onClose,
}: PbPhotoModeOverlayProps) {
  const [showScramble, setShowScramble] = useState(true)
  const handleClose = useCallback(() => {
    setShowScramble(true)
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        handleClose()
        return
      }
      if (event.code === "Space") {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener("keydown", onKeyDown, { capture: true })
    window.addEventListener("keyup", onKeyUp, { capture: true })
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true })
      window.removeEventListener("keyup", onKeyUp, { capture: true })
    }
  }, [handleClose])

  const identityLine = useMemo(() => {
    if (!handle) return displayName
    return `${displayName}  •  @${handle}`
  }, [displayName, handle])

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -right-16 bottom-[-14rem] h-[32rem] w-[32rem] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cyan-500/10 to-transparent" />
      </div>

      <div className="relative z-10 flex h-full flex-col px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
            <Box className="h-4 w-4 text-cyan-300" />
            <span className="text-xs font-semibold tracking-wider text-white/90">
              SPEEDCUBEHUB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "flex min-h-11 items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-semibold transition-colors",
                showScramble
                  ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-100"
                  : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
              )}
              onClick={() => setShowScramble((value) => !value)}
            >
              {showScramble ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Scramble
            </button>
            <button
              className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
              onClick={handleClose}
              aria-label="Close PB photo mode"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center sm:gap-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
              New PB Single
            </p>
            <p className="text-xl font-semibold text-white/90 sm:text-3xl">{eventLabel}</p>
          </div>

          <p className="font-mono text-[4.2rem] leading-none text-cyan-100 drop-shadow-[0_0_28px_rgba(34,211,238,0.35)] sm:text-[7.5rem]">
            {timeText}
          </p>

          {showScramble && scramble.trim().length > 0 && (
            <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-black/35 px-4 py-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                Scramble
              </p>
              <p className="break-words font-mono text-xs leading-relaxed text-white/85 sm:text-sm">
                {scramble}
              </p>
            </div>
          )}

          <p className="text-sm text-white/75 sm:text-base">{identityLine}</p>
        </div>

        <div className="pt-3 text-center text-xs tracking-wide text-white/45">
          Hold your cube in frame and snap your story
        </div>
      </div>
    </div>
  )
}
