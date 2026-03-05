"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShareCard, type ShareCardData, type AspectRatio } from "@/components/share/share-card"
import { cn } from "@/lib/utils"

const CARD_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 360, height: 640 },
  "1:1": { width: 400, height: 400 },
}

type ShareModalProps = {
  isOpen: boolean
  onClose: () => void
  data: ShareCardData
  defaultAspectRatio?: AspectRatio
}

export function ShareModal({
  isOpen,
  onClose,
  data,
  defaultAspectRatio,
}: ShareModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    defaultAspectRatio ?? "1:1"
  )
  const [showScramble, setShowScramble] = useState(true)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  const hasScramble =
    (data.variant === "solve" && !!data.scramble) ||
    data.variant === "pb"
  const baseSize = useMemo(() => CARD_DIMENSIONS[aspectRatio], [aspectRatio])

  useEffect(() => {
    if (!isOpen) return
    setAspectRatio(defaultAspectRatio ?? "1:1")
  }, [defaultAspectRatio, isOpen])

  useEffect(() => {
    if (!isOpen) return

    let resizeObserver: ResizeObserver | null = null
    let rafId = 0

    const updateScale = () => {
      const stage = stageRef.current
      if (!stage) return false
      const availableWidth = stage.clientWidth
      const availableHeight = stage.clientHeight
      if (availableWidth <= 0 || availableHeight <= 0) return false
      const nextScale = Math.min(
        availableWidth / baseSize.width,
        availableHeight / baseSize.height
      )
      setScale(Math.max(0.1, nextScale))
      return true
    }

    const attachObserver = () => {
      const stage = stageRef.current
      if (!stage) {
        rafId = window.requestAnimationFrame(attachObserver)
        return
      }

      updateScale()
      resizeObserver = new ResizeObserver(() => {
        updateScale()
      })
      resizeObserver.observe(stage)
    }

    attachObserver()
    window.addEventListener("resize", updateScale)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      resizeObserver?.disconnect()
      window.removeEventListener("resize", updateScale)
    }
  }, [baseSize.height, baseSize.width, isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 bg-black/95 p-0 sm:max-w-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Share Card</DialogTitle>
        </DialogHeader>

        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-white/10 bg-black/70 px-3 py-2">
            <button
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary/70 transition-colors"
              onClick={onClose}
            >
              Done
            </button>
            <button
              onClick={() => setAspectRatio("1:1")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                aspectRatio === "1:1"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/50"
              )}
            >
              Square
            </button>
            <button
              onClick={() => setAspectRatio("9:16")}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                aspectRatio === "9:16"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-secondary/50"
              )}
            >
              Vertical
            </button>
            {hasScramble && (
              <button
                onClick={() => setShowScramble((prev) => !prev)}
                className={cn(
                  "ml-auto rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  showScramble
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary/50"
                )}
              >
                Scramble
              </button>
            )}
          </div>

          <div className="flex-1 overflow-hidden bg-zinc-950 p-2 sm:p-4">
            <div ref={stageRef} className="flex h-full w-full items-center justify-center">
              <div
                style={{
                  width: baseSize.width,
                  height: baseSize.height,
                  transform: `scale(${scale})`,
                  transformOrigin: "center center",
                }}
              >
                <ShareCard
                  data={data}
                  aspectRatio={aspectRatio}
                  showScramble={showScramble}
                />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
