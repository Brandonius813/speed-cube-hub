import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { SocialProof } from "@/components/landing/social-proof"
import { getGlobalStats } from "@/lib/actions/stats"

export default async function Home() {
  const stats = await getGlobalStats()

  return (
    <main>
      <Hero />
      <Features />
      <SocialProof stats={stats} />
    </main>
  )
}
