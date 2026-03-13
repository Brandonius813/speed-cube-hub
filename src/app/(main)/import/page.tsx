import { ImportPageContent } from "@/components/import/import-page-content"
import { ScrollToTopOnMount } from "@/components/shared/scroll-to-top-on-mount"

export default function ImportPage() {
  return (
    <main>
      <ScrollToTopOnMount />
      <ImportPageContent />
    </main>
  )
}
