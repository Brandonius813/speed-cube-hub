"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Box } from "lucide-react"

const cubes = [
  {
    event: "3x3",
    name: "GAN 13 MagLev",
    details: "UV Coated, Strong magnets",
    isMain: true,
  },
  {
    event: "4x4",
    name: "MoYu AoSu WR M",
    details: "Stickerless, Spring tension adjusted",
    isMain: false,
  },
  {
    event: "5x5",
    name: "YJ MGC 5x5 M",
    details: "Stickerless",
    isMain: false,
  },
  {
    event: "2x2",
    name: "MoYu RS2 M",
    details: "Stock setup",
    isMain: false,
  },
]

export function MainCubes() {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Box className="h-5 w-5 text-primary" />
          Main Cubes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {cubes.map((cube) => (
            <div
              key={cube.event}
              className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/50 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                {cube.event}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">
                    {cube.name}
                  </p>
                  {cube.isMain && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent">
                      Main
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {cube.details}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
