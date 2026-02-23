import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { ProfileContent } from "@/components/profile/profile-content"
import { getProfile, getRecentActivity } from "@/lib/actions/profiles"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const [profileResult, sessions] = await Promise.all([
    getProfile(),
    getRecentActivity(),
  ])

  if (!profileResult.profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-muted-foreground">
            Profile not found. Please log in to view your profile.
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <ProfileContent
          profile={profileResult.profile}
          sessions={sessions}
        />
      </main>
      <Footer />
    </div>
  )
}
