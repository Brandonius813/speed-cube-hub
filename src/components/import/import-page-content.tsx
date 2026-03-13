"use client"

import dynamic from "next/dynamic"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ClipboardList, MessageSquare } from "lucide-react"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { Button } from "@/components/ui/button"
import { SessionForm } from "@/components/log/session-form"
import { ONBOARDING_TOURS, parseOnboardingTour } from "@/lib/onboarding"

const ImportContent = dynamic(
  () =>
    import("@/components/import/import-content").then(
      (module) => module.ImportContent
    ),
  {
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading import assistant...
      </div>
    ),
  }
)

type ImportTab = "manual" | "chat"

export function ImportPageContent() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab: ImportTab = searchParams.get("tab") === "chat" ? "chat" : "manual"
  const activeTour = parseOnboardingTour(searchParams.get("tour"))
  const importTour = activeTour === "bulk-import" ? activeTour : null

  function setActiveTab(nextTab: ImportTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === "manual") {
      params.delete("tab")
    } else {
      params.set("tab", "chat")
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function clearTour() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tour")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <>
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6">
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
              data-onboarding-target="import-chat-tab"
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

      {importTour && (
        <OnboardingTour
          key={importTour}
          open
          steps={ONBOARDING_TOURS[importTour]}
          onClose={clearTour}
          onSkip={clearTour}
        />
      )}
    </>
  )
}
