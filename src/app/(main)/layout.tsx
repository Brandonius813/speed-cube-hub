import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"
import { OfflineIndicator } from "@/components/shared/offline-indicator"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {children}
      <Footer />
      <OfflineIndicator />
    </div>
  )
}
