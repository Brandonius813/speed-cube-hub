import { Navbar } from "@/components/shared/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { SocialProof } from "@/components/landing/social-proof"
import { Footer } from "@/components/shared/footer"
import { getGlobalStats } from "@/lib/actions/stats"

export default async function Home() {
  const stats = await getGlobalStats()

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <SocialProof stats={stats} />
      </main>
      <Footer />
    </div>
  )
}
