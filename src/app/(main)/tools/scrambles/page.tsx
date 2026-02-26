import { BatchScrambleGenerator } from "@/components/tools/batch-scramble-generator"

export const metadata = {
  title: "Batch Scramble Generator — SpeedCubeHub",
  description: "Generate up to 999 scrambles for any WCA event",
}

export default function ScramblesPage() {
  return <BatchScrambleGenerator />
}
