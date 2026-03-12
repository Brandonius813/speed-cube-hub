import { Footer } from "@/components/shared/footer"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { SocialProof } from "@/components/landing/social-proof"
import { AdSlot } from "@/components/ads/ad-slot"
import { Navbar } from "@/components/shared/navbar"
import { getGlobalStats } from "@/lib/actions/stats"

// Regenerate every 5 minutes — stats don't need to be real-time
export const revalidate = 300

export default async function Home() {
  const stats = await getGlobalStats()
  const homeAdSlot = process.env.NEXT_PUBLIC_ADSENSE_HOME_INLINE_SLOT ?? null

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        {homeAdSlot ? (
          <div className="px-4 pb-2 sm:px-6 sm:pb-4">
            <div className="mx-auto max-w-5xl">
              <AdSlot
                slotId={homeAdSlot}
                minHeight={280}
              />
            </div>
          </div>
        ) : null}
        <SocialProof stats={stats} />
      </main>
      <Footer />
    </div>
  )
}
