"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Globe, Link2, Trophy } from "lucide-react"

const links = [
  {
    type: "WCA",
    label: "WCA Profile",
    value: "Coming soon",
    url: "#",
  },
  {
    type: "YouTube",
    label: "YouTube",
    value: "Coming soon",
    url: "#",
  },
]

const sponsors = [
  { name: "SpeedCubeShop", url: "https://speedcubeshop.com" },
  { name: "TheCubicle", url: "https://thecubicle.com" },
]

function LinkIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    WCA: "#22D3EE",
    YouTube: "#EF4444",
    Instagram: "#F97316",
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
      style={{ backgroundColor: `${colors[type] || "#6366F1"}20` }}
    >
      <Globe
        className="h-4 w-4"
        style={{ color: colors[type] || "#6366F1" }}
      />
    </div>
  )
}

export function LinksSponsors() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Link2 className="h-5 w-5 text-accent" />
            Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5">
            {links.map((link) => (
              <div
                key={link.type}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/50 p-3"
              >
                <LinkIcon type={link.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {link.label}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-chart-3" />
            Sponsors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5">
            {sponsors.map((sponsor) => (
              <a
                key={sponsor.name}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-lg border border-border/50 bg-secondary/50 p-3 transition-colors hover:border-chart-3/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-chart-3/10 font-mono text-xs font-bold text-chart-3">
                    {sponsor.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {sponsor.name}
                  </span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
