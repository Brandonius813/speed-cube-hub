import Link from "next/link"
import { Box } from "lucide-react"
import { FeedbackModal } from "@/components/shared/feedback-modal"

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Box className="h-4 w-4" />
          <span className="text-sm">Speed Cube Hub</span>
        </div>
        <FeedbackModal />
        <p className="text-sm text-muted-foreground">
          Built by cubers, for cubers.
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
          <Link href="/privacy" className="hover:text-muted-foreground transition-colors">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-muted-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Brandon True
        </p>
      </div>
    </footer>
  )
}
