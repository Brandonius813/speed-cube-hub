import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Box } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 sm:pt-16 md:pt-28 md:pb-32">
      {/* Gradient glow behind hero */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[300px] w-[300px] rounded-full bg-primary/10 blur-[120px] sm:h-[400px] sm:w-[400px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:gap-2.5 sm:px-4 sm:py-2 sm:text-sm text-muted-foreground">
          <Box className="h-6 w-6 shrink-0 text-accent sm:h-7 sm:w-7" />
          <span>Track every solve. Improve every session.</span>
        </div>

        <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
          Your cubing journey,{" "}
          <span className="text-primary">measured.</span>
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg md:text-xl">
          Speed Cube Hub is the practice tracking platform built for competitive
          speed cubers. Log sessions, analyze trends, and share your progress
          with the community.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
