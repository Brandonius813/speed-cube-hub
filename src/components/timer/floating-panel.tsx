"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingPanelProps {
  position: "bottom-left" | "bottom-right";
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional extra classes on the outer wrapper (e.g. max-w-md for charts) */
  className?: string;
}

export function FloatingPanel({ position, title, onClose, children, className }: FloatingPanelProps) {
  return (
    <div
      className={cn(
        "fixed bottom-20 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-lg",
        position === "bottom-left" ? "left-4" : "right-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content — scrollable for tall content */}
      <div className="max-h-[60vh] overflow-y-auto p-3">{children}</div>
    </div>
  );
}
