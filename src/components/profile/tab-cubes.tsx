"use client"

import { MainCubes } from "@/components/profile/main-cubes"
import type { ProfileCube, CubeHistoryEntry } from "@/lib/types"

export function TabCubes({
  cubes,
  cubeHistory,
  isOwner,
}: {
  cubes: ProfileCube[]
  cubeHistory: CubeHistoryEntry[]
  isOwner: boolean
}) {
  return <MainCubes cubes={cubes} cubeHistory={cubeHistory} isOwner={isOwner} />
}
