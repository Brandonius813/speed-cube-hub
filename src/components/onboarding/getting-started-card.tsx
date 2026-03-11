"use client"

import Link from "next/link"
import { CheckCircle2, Circle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getOnboardingCompletedCount,
  hasCompletedOnboarding,
  isOnboardingStepComplete,
  ONBOARDING_CHECKLIST,
} from "@/lib/onboarding"
import type { UserOnboarding } from "@/lib/types"

export function GettingStartedCard({
  onboarding,
  onReplay,
}: {
  onboarding: UserOnboarding
  onReplay: () => void | Promise<void>
}) {
  const completedCount = getOnboardingCompletedCount(onboarding)
  const completed = hasCompletedOnboarding(onboarding)

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
            const done = isOnboardingStepComplete(onboarding, item.step)

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
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <p className="font-medium text-foreground">{item.label}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>

                {done ? (
                  <span className="text-sm font-medium text-green-400">Done</span>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    className="min-h-11 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link href={item.href}>{item.cta}</Link>
                  </Button>
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
              : "You can skip tours when they open, and this checklist will stay here."}
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
