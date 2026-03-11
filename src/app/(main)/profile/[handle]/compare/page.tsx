import { notFound, redirect } from "next/navigation"
import { ProfileComparisonContent } from "@/components/profile/profile-comparison-content"
import { getPBsByUserId } from "@/lib/actions/personal-bests"
import { getProfile, getProfileByHandle } from "@/lib/actions/profiles"
import { getSessionsByUserId } from "@/lib/actions/sessions"
import { buildProfileComparisonData } from "@/lib/profile-comparison"
import { createClient } from "@/lib/supabase/server"

export default async function ProfileComparePage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const [{ profile: targetProfile }, supabase] = await Promise.all([
    getProfileByHandle(handle),
    createClient(),
  ])

  if (!targetProfile) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/profile/${handle}/compare`)}`)
  }

  const { profile: viewerProfile } = await getProfile()

  if (!viewerProfile) {
    redirect("/profile")
  }

  if (viewerProfile.id === targetProfile.id) {
    redirect(`/profile/${handle}`)
  }

  const [
    viewerSessionsResult,
    targetSessionsResult,
    viewerPbsResult,
    targetPbsResult,
  ] = await Promise.all([
    getSessionsByUserId(viewerProfile.id),
    getSessionsByUserId(targetProfile.id),
    getPBsByUserId(viewerProfile.id),
    getPBsByUserId(targetProfile.id),
  ])

  const comparisonData = buildProfileComparisonData({
    viewerProfile,
    targetProfile,
    viewerSessions: viewerSessionsResult.data,
    targetSessions: targetSessionsResult.data,
    viewerPbs: viewerPbsResult.data,
    targetPbs: targetPbsResult.data,
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <ProfileComparisonContent data={comparisonData} />
    </main>
  )
}
