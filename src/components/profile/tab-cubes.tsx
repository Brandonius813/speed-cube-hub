"use client"

import { MainCubes } from "@/components/profile/main-cubes"
import type { ProfileCube } from "@/lib/types"

export function TabCubes({
  cubes,
  isOwner,
}: {
  cubes: ProfileCube[]
  isOwner: boolean
}) {
  return <MainCubes cubes={cubes} isOwner={isOwner} />
}
