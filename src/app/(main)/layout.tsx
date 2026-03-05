import { Suspense } from "react"
import { Navbar } from "@/components/shared/navbar"
import { Footer } from "@/components/shared/footer"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      {children}
      <Footer />
    </div>
  )
}
