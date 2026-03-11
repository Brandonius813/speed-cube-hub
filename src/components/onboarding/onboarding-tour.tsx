"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, MousePointerClick, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { OnboardingTourStep } from "@/lib/onboarding"

type TourRect = {
  top: number
  left: number
  width: number
  height: number
}

const CARD_WIDTH = 320
const VIEWPORT_PADDING = 16

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function OnboardingTour({
  open,
  steps,
  onClose,
  onSkip,
}: {
  open: boolean
  steps: OnboardingTourStep[]
  onClose: () => void
  onSkip: () => void
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<TourRect | null>(null)

  useEffect(() => {
    if (!open) return

    const step = steps[stepIndex]
    if (!step?.target) return

    let frame = 0
    const resolveTarget = () => {
      const element = document.querySelector<HTMLElement>(
        `[data-onboarding-target="${step.target}"]`
      )

      if (!element) {
        setTargetRect(null)
        return
      }

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      })

      frame = window.requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect()
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        })
      })
    }

    resolveTarget()
    window.addEventListener("resize", resolveTarget)
    window.addEventListener("scroll", resolveTarget, true)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", resolveTarget)
      window.removeEventListener("scroll", resolveTarget, true)
    }
  }, [open, stepIndex, steps])

  useEffect(() => {
    if (!open) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onSkip()
      }
    }

    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [onSkip, open])

  const step = steps[stepIndex]
  const spotlightRect = step?.target ? targetRect : null
  const isLastStep = stepIndex === steps.length - 1

  const cardStyle = useMemo(() => {
    if (!spotlightRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }
    }

    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth
    const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight
    const estimatedCardHeight = 220
    const prefersBelow =
      spotlightRect.top + spotlightRect.height + estimatedCardHeight + 28 < viewportHeight

    const top = prefersBelow
      ? spotlightRect.top + spotlightRect.height + 18
      : Math.max(VIEWPORT_PADDING, spotlightRect.top - estimatedCardHeight - 18)

    const left = clamp(
      spotlightRect.left + spotlightRect.width / 2 - CARD_WIDTH / 2,
      VIEWPORT_PADDING,
      viewportWidth - CARD_WIDTH - VIEWPORT_PADDING
    )

    return {
      top,
      left,
    }
  }, [spotlightRect])

  const fingerStyle = useMemo(() => {
    if (!spotlightRect) return null
    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth
    const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight
    return {
      top: clamp(
        spotlightRect.top + spotlightRect.height + 6,
        VIEWPORT_PADDING,
        viewportHeight - 56
      ),
      left: clamp(
        spotlightRect.left + spotlightRect.width - 20,
        VIEWPORT_PADDING,
        viewportWidth - 56
      ),
    }
  }, [spotlightRect])

  if (!open || !step) return null

  return (
    <div className="fixed inset-0 z-[140]">
      {spotlightRect ? (
        <>
          <div
            className="fixed bg-black/65 backdrop-blur-[3px]"
            style={{ top: 0, left: 0, width: "100vw", height: Math.max(0, spotlightRect.top - 10) }}
          />
          <div
            className="fixed bg-black/65 backdrop-blur-[3px]"
            style={{
              top: Math.max(0, spotlightRect.top - 10),
              left: 0,
              width: Math.max(0, spotlightRect.left - 10),
              height: spotlightRect.height + 20,
            }}
          />
          <div
            className="fixed bg-black/65 backdrop-blur-[3px]"
            style={{
              top: Math.max(0, spotlightRect.top - 10),
              left: spotlightRect.left + spotlightRect.width + 10,
              right: 0,
              height: spotlightRect.height + 20,
            }}
          />
          <div
            className="fixed bg-black/65 backdrop-blur-[3px]"
            style={{
              top: spotlightRect.top + spotlightRect.height + 10,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <div
            className="pointer-events-none fixed rounded-2xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0)]"
            style={{
              top: spotlightRect.top - 10,
              left: spotlightRect.left - 10,
              width: spotlightRect.width + 20,
              height: spotlightRect.height + 20,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[3px]" />
      )}

      {fingerStyle && (
        <div
          className="pointer-events-none fixed animate-bounce rounded-full border border-primary/40 bg-primary/20 p-2 text-primary shadow-lg"
          style={fingerStyle}
        >
          <MousePointerClick className="h-5 w-5" />
        </div>
      )}

      <div
        className="fixed w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur"
        style={cardStyle}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Guided Tour
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
            aria-label="Close onboarding tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip Tour
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            className="min-h-11 border-border/60"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            type="button"
            onClick={() => {
              if (isLastStep) {
                onClose()
                return
              }
              setStepIndex((current) => Math.min(steps.length - 1, current + 1))
            }}
            className="min-h-11 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLastStep ? "Done" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  )
}
