"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = {
  onData: (text: string, fileName?: string) => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_EXTENSIONS = [".csv", ".txt", ".tsv", ".json"]

export function ImportDropZone({ onData, disabled }: Props) {
  const [dragActive, setDragActive] = useState(false)
  const [pastedText, setPastedText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        alert("File is too large. Maximum size is 5 MB.")
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result
        if (typeof text === "string") {
          onData(text, file.name)
        }
      }
      reader.readAsText(file)
    },
    [onData]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (disabled) return
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [disabled, handleFile]
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) setDragActive(true)
    },
    [disabled]
  )

  const onDragLeave = useCallback(() => setDragActive(false), [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so same file can be selected again
      e.target.value = ""
    },
    [handleFile]
  )

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/50 hover:bg-accent/30",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          Drop a file here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          CSV, TXT, TSV, or JSON \u2014 up to 5 MB
        </p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Supports csTimer, CubeTime, Twisty Timer, or any timer export
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onFileChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-xs font-medium text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* Paste text */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>Paste your data directly</span>
        </div>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder={"Paste solve times, a CSV export, or any timer data here..."}
          className="min-h-[120px] w-full rounded-lg border border-border/50 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={disabled}
        />
        <Button
          onClick={() => {
            if (pastedText.trim()) onData(pastedText.trim())
          }}
          disabled={disabled || !pastedText.trim()}
          className="w-full"
        >
          Analyze Pasted Data
        </Button>
      </div>
    </div>
  )
}
