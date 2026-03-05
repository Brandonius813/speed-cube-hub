import { Suspense } from "react"
import { Navbar } from "@/components/shared/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { SocialProof } from "@/components/landing/social-proof"
import { Footer } from "@/components/shared/footer"
import { getGlobalStats } from "@/lib/actions/stats"

// Regenerate every 5 minutes — stats don't need to be real-time
export const revalidate = 300

export default async function Home() {
  const stats = await getGlobalStats()

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <main>
        <Hero />
        <Features />
        <SocialProof stats={stats} />
      </main>
      <Footer />
    </div>
  )
}
