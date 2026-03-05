import { ImportPageContent } from "@/components/import/import-page-content"
import { ScrollToTopOnMount } from "@/components/shared/scroll-to-top-on-mount"

export default function ImportPage() {
  return (
    <main className="h-[calc(100dvh-4rem)] min-h-0">
      <ScrollToTopOnMount />
      <ImportPageContent />
    </main>
  )
}
