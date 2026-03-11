"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { BarChart3, Check, Copy, Share2, X } from "lucide-react"
import { ShareModal } from "@/components/share/share-modal"
import type { ShareCardData } from "@/components/share/share-card"
import { getProfile } from "@/lib/actions/profiles"
import { formatTimeMs } from "@/lib/timer/averages"
import {
  buildStatWindowText,
  summarizeStatWindow,
  type StatWindowSolveInput,
  type StatWindowSummary,
} from "@/lib/timer/stat-window-summary"
import { cn } from "@/lib/utils"

export type StatDetailInfo = {
  label: string
  solves: StatWindowSolveInput[]
}

type StatDetailModalProps = {
  isOpen: boolean
  onClose: () => void
  info: StatDetailInfo | null
  onSolveClick: (solve: StatWindowSolveInput) => void
  onShare?: (summary: StatWindowSummary) => void
}

type DetailTab = "times" | "distribution"

export function StatDetailModal({
  isOpen,
  onClose,
  info,
  onSolveClick,
  onShare,
}: StatDetailModalProps) {
  const [shareCardData, setShareCardData] = useState<ShareCardData | null>(null)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareAuthor, setShareAuthor] = useState({
    userName: "You",
    handle: "you",
    avatarUrl: null as string | null,
  })
  const summary = useMemo(
    () => (info ? summarizeStatWindow(info.label, info.solves) : null),
    [info]
  )

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  useEffect(() => {
    let cancelled = false

    void getProfile()
      .then(({ profile }) => {
        if (cancelled || !profile) return
        setShareAuthor({
          userName: profile.display_name || "You",
          handle: profile.handle || "you",
          avatarUrl: profile.avatar_url ?? null,
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  if (!isOpen || !info || !summary || summary.solves.length === 0) return null

  const modalKey =
    `${summary.label}:${summary.solves[0]?.id ?? "none"}:` +
    `${summary.solves[summary.solves.length - 1]?.id ?? "none"}:${summary.windowSize}`
  const handleSummaryShare = (currentSummary: StatWindowSummary) => {
    if (onShare) {
      onShare(currentSummary)
      return
    }

    setShareCardData({
      variant: "average",
      event: getStoredTimerEvent(),
      summary: currentSummary,
      completedAt: currentSummary.lastSolvedAt ?? new Date().toISOString(),
      userName: shareAuthor.userName,
      handle: shareAuthor.handle,
      avatarUrl: shareAuthor.avatarUrl,
    })
    setShareModalOpen(true)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <StatDetailStage
          key={modalKey}
          summary={summary}
          solves={info.solves}
          onClose={onClose}
          onSolveClick={onSolveClick}
          onShare={handleSummaryShare}
        />
      </div>
      {shareCardData && (
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          data={shareCardData}
          defaultAspectRatio="1:1"
        />
      )}
    </>
  )
}

function StatDetailStage({
  summary,
  solves,
  onClose,
  onSolveClick,
  onShare,
}: {
  summary: StatWindowSummary
  solves: StatWindowSolveInput[]
  onClose: () => void
  onSolveClick: (solve: StatWindowSolveInput) => void
  onShare?: (summary: StatWindowSummary) => void
}) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>("times")
  const showDistributionTab = summary.windowSize >= 25 && summary.bins.length > 0

  const handleCopy = async () => {
    const text = buildStatWindowText(summary)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <div
      className="pointer-events-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-[0.24em] text-indigo-300/90">
                {summary.label}
              </span>
              <span className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {summary.windowSize} solves
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {summary.displayValue}
              </span>
              {summary.sigmaMs !== null && (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  σ {formatTimeMs(summary.sigmaMs)}
                </span>
              )}
              {!summary.isSingle && !summary.isMean && (
                <span className="text-xs text-muted-foreground">
                  Parentheses = trimmed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onShare && (
              <button
                onClick={() => onShare(summary)}
                className="rounded-md p-1.5 transition-colors hover:bg-secondary/80"
                title="Share average"
              >
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="rounded-md p-1.5 transition-colors hover:bg-secondary/80"
              title="Copy as text"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 transition-colors hover:bg-secondary/80"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <SummaryPill
            label="Best"
            value={summary.bestMs === null ? "—" : formatTimeMs(summary.bestMs)}
          />
          <SummaryPill
            label="Worst"
            value={summary.worstMs === null ? "—" : formatTimeMs(summary.worstMs)}
          />
          <SummaryPill label="+2" value={String(summary.plus2Count)} />
          <SummaryPill label="DNF" value={String(summary.dnfCount)} />
        </div>

        {showDistributionTab && (
          <div className="mt-3 flex gap-1">
            <TabButton
              label="Times"
              active={activeTab === "times"}
              onClick={() => setActiveTab("times")}
            />
            <TabButton
              label="Distribution"
              active={activeTab === "distribution"}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              onClick={() => setActiveTab("distribution")}
            />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "distribution" && showDistributionTab ? (
          <DistributionTab summary={summary} />
        ) : (
          <TimesTab
            summary={summary}
            onSelectSolve={(solveId) => {
              const solve = solves.find((entry) => entry.id === solveId)
              if (!solve) return
              onClose()
              onSolveClick(solve)
            }}
          />
        )}
      </div>
    </div>
  )
}

function TimesTab({
  summary,
  onSelectSolve,
}: {
  summary: StatWindowSummary
  onSelectSolve: (solveId: string) => void
}) {
  return (
    <div>
      {summary.solves.map((solve, index) => {
        const isDnf = solve.penalty === "DNF"
        const isPlus2 = solve.penalty === "+2"
        const display = solve.isTrimmed ? `(${solve.displayTime})` : solve.displayTime

        return (
          <button
            key={solve.id}
            onClick={() => onSelectSolve(solve.id)}
            className="flex w-full items-center gap-3 border-b border-border/20 px-4 py-2 text-left transition-colors hover:bg-secondary/30"
          >
            <span className="w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground/60">
              {index + 1}.
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 font-mono text-sm tabular-nums",
                isDnf && "text-destructive",
                isPlus2 && "text-yellow-400",
                solve.isTrimmed && "text-muted-foreground/60"
              )}
            >
              {display}
              {isPlus2 && !solve.isTrimmed && <span className="ml-0.5 text-[10px]">+</span>}
            </span>
            <span className="max-w-[160px] truncate font-mono text-[10px] text-muted-foreground/40">
              {solve.scramble?.slice(0, 34)}
              {solve.scramble && solve.scramble.length > 34 ? "…" : ""}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DistributionTab({ summary }: { summary: StatWindowSummary }) {
  const maxCount = Math.max(...summary.bins.map((bin) => bin.count), 1)
  const includedCount = Math.max(1, summary.windowSize - summary.dnfCount)

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard
          label="Included"
          value={String(summary.windowSize - summary.dnfCount)}
        />
        <SummaryCard label="Trimmed" value={String(summary.trimmedIndices.length)} />
        <SummaryCard label="+2" value={String(summary.plus2Count)} />
        <SummaryCard label="DNF" value={String(summary.dnfCount)} />
      </div>

      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Time Distribution
          </p>
          <p className="text-xs text-muted-foreground">
            DNFs excluded from buckets
          </p>
        </div>

        <div className="space-y-2">
          {summary.bins.map((bin) => (
            <div key={`${bin.startMs}-${bin.endMs}`} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] text-zinc-300">
                    {bin.label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {bin.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{
                      width: `${Math.max(8, (bin.count / maxCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <span className="text-right text-[11px] text-muted-foreground">
                {Math.round((bin.count / includedCount) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="ml-1.5 font-mono text-xs tabular-nums text-foreground">
        {value}
      </span>
    </div>
  )
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon?: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-secondary/50"
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function getStoredTimerEvent(): string {
  if (typeof window === "undefined") return "333"
  try {
    return localStorage.getItem("timer-event") ?? "333"
  } catch {
    return "333"
  }
}
