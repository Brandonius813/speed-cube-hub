import { redirect } from "next/navigation"
import { markOnboardingStepComplete } from "@/lib/actions/onboarding"

export default async function GettingStartedFeedPage() {
  await markOnboardingStepComplete("feed_visited")
  redirect("/feed?tour=feed")
}
