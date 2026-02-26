"use client"

import { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, Share2 } from "lucide-react"
import { ShareCard, type ShareCardData, type AspectRatio } from "@/components/share/share-card"
import { captureCardAsBlob, downloadBlob, shareOrDownload } from "@/components/share/share-utils"

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
    defaultAspectRatio ?? "9:16"
  )
  const [showScramble, setShowScramble] = useState(true)
  const [isCapturing, setIsCapturing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const hasScramble =
    (data.variant === "solve" && !!data.scramble) ||
    data.variant === "pb"

  const filenameBase = `speedcubehub-${data.variant}`

  const handleCapture = async (mode: "download" | "share") => {
    if (!cardRef.current || isCapturing) return
    setIsCapturing(true)
    try {
      const blob = await captureCardAsBlob(cardRef.current)
      if (!blob) return
      const filename = `${filenameBase}-${aspectRatio.replace(":", "x")}.png`
      if (mode === "share") {
        await shareOrDownload(blob, filename, "SpeedCubeHub")
      } else {
        downloadBlob(blob, filename)
      }
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>

        {/* Aspect ratio toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setAspectRatio("9:16")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              aspectRatio === "9:16"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            Story (9:16)
          </button>
          <button
            onClick={() => setAspectRatio("1:1")}
            className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              aspectRatio === "1:1"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            Post (1:1)
          </button>
        </div>

        {/* Scramble toggle */}
        {hasScramble && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showScramble}
              onChange={(e) => setShowScramble(e.target.checked)}
              className="rounded border-border"
            />
            Show scramble
          </label>
        )}

        {/* Preview — scaled to fit modal */}
        <div className="flex justify-center overflow-hidden rounded-lg bg-zinc-950 p-3">
          <div
            className="origin-top-left"
            style={{
              transform:
                aspectRatio === "9:16" ? "scale(0.4)" : "scale(0.55)",
              height:
                aspectRatio === "9:16" ? 640 * 0.4 : 400 * 0.55,
              width:
                aspectRatio === "9:16" ? 360 * 0.4 : 400 * 0.55,
            }}
          >
            <ShareCard
              ref={cardRef}
              data={data}
              aspectRatio={aspectRatio}
              showScramble={showScramble}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleCapture("download")}
            disabled={isCapturing}
          >
            <Download className="mr-2 h-4 w-4" />
            {isCapturing ? "..." : "Download"}
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleCapture("share")}
            disabled={isCapturing}
          >
            <Share2 className="mr-2 h-4 w-4" />
            {isCapturing ? "..." : "Share"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
