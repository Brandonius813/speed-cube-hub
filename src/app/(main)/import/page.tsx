import { ImportContent } from "@/components/import/import-content"
import { ScrollToTopOnMount } from "@/components/shared/scroll-to-top-on-mount"

export default function ImportPage() {
  return (
    <main className="h-[calc(100dvh-4rem)]">
      <ScrollToTopOnMount />
      <ImportContent />
    </main>
  )
}
