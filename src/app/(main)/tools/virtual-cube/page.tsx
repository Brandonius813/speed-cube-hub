import type { Metadata } from "next"
import { VirtualCubeContent } from "@/components/tools/virtual-cube-content"

export const metadata: Metadata = {
  title: "Virtual Cube | Speed Cube Hub",
  description: "Interactive 3D virtual Rubik's cube with keyboard controls",
}

export default function VirtualCubePage() {
  return <VirtualCubeContent />
}
