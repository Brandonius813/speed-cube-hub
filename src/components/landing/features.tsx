import { Card, CardContent } from "@/components/ui/card"

function TrackingVisual() {
  const solves = [
    { time: "12.34", event: "3x3" },
    { time: "8.91", event: "2x2" },
    { time: "45.22", event: "4x4" },
  ]
  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-border/50 bg-secondary/50">
      <div className="flex items-center gap-2 border-b border-border/30 px-3 py-2">
        <div className="h-2 w-2 rounded-full bg-chart-1" />
        <div className="h-2 w-2 rounded-full bg-chart-3" />
        <div className="h-2 w-2 rounded-full bg-chart-4" />
        <span className="ml-auto font-mono text-xs text-muted-foreground">session_log</span>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {solves.map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-md bg-background/60 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">{s.event}</span>
            <span className="font-mono text-sm font-semibold text-foreground">{s.time}s</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressVisual() {
  const bars = [35, 50, 42, 65, 58, 72, 68]
  const days = ["M", "T", "W", "T", "F", "S", "S"]
  const maxBar = Math.max(...bars)
  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-border/50 bg-secondary/50 p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Weekly avg</span>
        <span className="font-mono text-sm font-semibold text-accent">-2.3s</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 72 }}>
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1" style={{ height: "100%" }}>
            <div className="flex w-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-sm"
                style={{
                  height: `${Math.round((h / maxBar) * 100)}%`,
                  backgroundColor: i === bars.length - 1 ? "#22D3EE" : "#6366F1",
                  opacity: i === bars.length - 1 ? 1 : 0.7 + (i * 0.04),
                }}
              />
            </div>
            <span className="text-[10px] leading-none text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileVisual() {
  return (
    <div className="mb-5 overflow-hidden rounded-lg border border-border/50 bg-secondary/50 p-3">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
          JD
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">CubeJD</div>
          <div className="text-xs text-muted-foreground">3x3 main</div>
        </div>
        <div className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
          Public
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "PB", value: "7.82s" },
          { label: "Streak", value: "14d" },
          { label: "Solves", value: "2.1K" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-md bg-background/60 px-2 py-1.5 text-center">
            <div className="font-mono text-sm font-semibold text-foreground">{stat.value}</div>
            <div className="text-[10px] text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const features = [
  {
    visual: TrackingVisual,
    title: "Track Practice",
    description:
      "Log every session with event type, solve count, times, and notes. Build a complete history of your cubing journey.",
  },
  {
    visual: ProgressVisual,
    title: "See Your Progress",
    description:
      "Visualize your practice with charts and stats. Spot trends, identify strengths, and find areas to improve.",
  },
  {
    visual: ProfileVisual,
    title: "Share Your Profile",
    description:
      "Show off your PBs, streaks, and practice stats with a public profile. Connect with the cubing community.",
  },
]

export function Features() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center sm:mb-16">
          <h2 className="text-balance text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            Everything you need to level up
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">
            Simple tools designed for serious cubers.
          </p>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group border-border/50 bg-card transition-all hover:border-primary/30"
            >
              <CardContent className="p-5 sm:p-6">
                <feature.visual />
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
