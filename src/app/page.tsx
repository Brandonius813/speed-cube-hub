import { Navbar } from "@/components/shared/navbar"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { SocialProof } from "@/components/landing/social-proof"
import { Footer } from "@/components/shared/footer"

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <SocialProof />
      </main>
      <Footer />
    </div>
  )
}
