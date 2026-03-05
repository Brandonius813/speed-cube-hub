"use client"

import { useState } from "react"
import { ClipboardList, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SessionForm } from "@/components/log/session-form"
import { ImportContent } from "@/components/import/import-content"

type ImportTab = "manual" | "chat"

export function ImportPageContent() {
  const [activeTab, setActiveTab] = useState<ImportTab>("manual")

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl min-h-0 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Import Data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Log a single session manually or bulk import data with chat.
        </p>
      </div>

      <div className="self-start rounded-lg bg-secondary/50 p-1">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          <Button
            type="button"
            variant={activeTab === "manual" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("manual")}
            className="min-h-11 gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            Log Session Manually
          </Button>
          <Button
            type="button"
            variant={activeTab === "chat" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("chat")}
            className="min-h-11 gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Chat Bulk Import
          </Button>
        </div>
      </div>

      {activeTab === "manual" ? (
        <SessionForm />
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/50 bg-card/20">
          <ImportContent />
        </div>
      )}
    </div>
  )
}
