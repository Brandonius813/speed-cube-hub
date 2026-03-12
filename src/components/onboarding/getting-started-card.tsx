"use client"

import { useOptimistic, useState, useTransition } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { markOnboardingStepComplete } from "@/lib/actions/onboarding"
import {
  getOnboardingCompletedCount,
  hasCompletedOnboarding,
  isOnboardingStepComplete,
  ONBOARDING_CHECKLIST,
  type OnboardingStepId,
} from "@/lib/onboarding"
import type { UserOnboarding } from "@/lib/types"

export function GettingStartedCard({
  onboarding,
  onReplay,
}: {
  onboarding: UserOnboarding
  onReplay: () => void | Promise<void>
}) {
  const [isPending, startTransition] = useTransition()
  const [pendingStep, setPendingStep] = useState<OnboardingStepId | null>(null)
  const [optimisticOnboarding, setOptimisticOnboarding] = useOptimistic(
    onboarding,
    (_, nextOnboarding: UserOnboarding) => nextOnboarding
  )
  const completedCount = getOnboardingCompletedCount(optimisticOnboarding)
  const completed = hasCompletedOnboarding(optimisticOnboarding)

  function handleManualComplete(step: OnboardingStepId) {
    setPendingStep(step)
    startTransition(async () => {
      const result = await markOnboardingStepComplete(step)
      if (result.success && result.onboarding) {
        setOptimisticOnboarding(result.onboarding)
      }
      setPendingStep(null)
    })
  }

  return (
    <Card className={completed ? "border-primary/40 bg-primary/5" : "border-border/50 bg-card"}>
      <CardHeader className="gap-2">
        <div className="flex items-center gap-2">
          {completed ? (
            <Sparkles className="h-5 w-5 text-primary" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          )}
          <CardTitle className="text-foreground">
            {completed ? "Onboarding complete" : "Getting Started"}
          </CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          {completed
            ? "Nice. You’ve seen the core SpeedCubeHub experience and can replay the tour any time."
            : `${completedCount}/${ONBOARDING_CHECKLIST.length} steps complete. Work through these to learn the app without getting spammed.`}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {ONBOARDING_CHECKLIST.map((item) => {
            const done = isOnboardingStepComplete(optimisticOnboarding, item.step)
            const isSaving = isPending && pendingStep === item.step

            return (
              <div
                key={item.step}
                className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleManualComplete(item.step)}
                        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:cursor-wait disabled:opacity-60"
                        aria-label={`Mark ${item.label} done`}
                      >
                        <Circle className="h-4 w-4" />
                      </button>
                    )}
                    <p className="font-medium text-foreground">{item.label}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>

                {done ? (
                  <span className="text-sm font-medium text-green-400">Done</span>
                ) : (
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Button
                      asChild
                      size="sm"
                      disabled={isSaving}
                      className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Link href={item.href}>{item.cta}</Link>
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {completed
              ? "Replay the tour without resetting your progress."
              : onboarding.dismissed_at
              ? "Auto-launch is off. You can resume the tour any time from here."
              : "You can skip tours when they open, and if you already did something elsewhere you can tap the checklist circle to mark it done."}
          </p>

          <Button
            type="button"
            variant={completed ? "default" : "outline"}
            onClick={() => void onReplay()}
            className={completed ? "min-h-11 bg-primary text-primary-foreground hover:bg-primary/90" : "min-h-11 border-border/60"}
          >
            {completed ? "Replay Tour" : onboarding.dismissed_at ? "Resume Tour" : "Restart Tour"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
