import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users } from "lucide-react"

export function SocialProof() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card px-4 py-8 text-center sm:p-10 md:p-12">
          {/* Subtle accent glow */}
          <div className="pointer-events-none absolute -top-20 right-0 h-40 w-40 rounded-full bg-accent/5 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-primary/5 blur-[80px]" />

          <div className="relative">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs sm:px-4 sm:text-sm text-muted-foreground">
              <Users className="h-4 w-4 shrink-0 text-accent" />
              <span>Growing community</span>
            </div>

            <h2 className="text-balance text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
              Join <span className="text-accent">500+</span> speed cubers
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              Cubers around the world use Speed Cube Hub to track their practice,
              beat their PBs, and stay consistent.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-4">
              <div className="rounded-lg bg-secondary/60 px-2 py-3 text-center sm:bg-transparent sm:px-0 sm:py-0">
                <div className="font-mono text-xl font-bold text-foreground sm:text-2xl">12K+</div>
                <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground sm:mt-1 sm:text-sm">Sessions logged</div>
              </div>
              <div className="rounded-lg bg-secondary/60 px-2 py-3 text-center sm:bg-transparent sm:px-0 sm:py-0">
                <div className="font-mono text-xl font-bold text-foreground sm:text-2xl">3.2K</div>
                <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground sm:mt-1 sm:text-sm">Hours practiced</div>
              </div>
              <div className="rounded-lg bg-secondary/60 px-2 py-3 text-center sm:bg-transparent sm:px-0 sm:py-0">
                <div className="font-mono text-xl font-bold text-foreground sm:text-2xl">850+</div>
                <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground sm:mt-1 sm:text-sm">PBs broken</div>
              </div>
            </div>

            <Link href="/signup" className="mt-6 inline-block sm:mt-8">
              <Button size="lg" className="gap-2 bg-primary px-8 text-primary-foreground hover:bg-primary/90">
                Start Tracking
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
