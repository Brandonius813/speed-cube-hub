import { redirect } from "next/navigation"

export default function PracticeStatsPage() {
  redirect("/profile?tab=stats")
}
