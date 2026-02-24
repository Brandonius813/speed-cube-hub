import Link from "next/link"
import { Box } from "lucide-react"
import { FeedbackModal } from "@/components/shared/feedback-modal"

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Box className="h-4 w-4" />
              <span className="text-sm font-medium">Speed Cube Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built by cubers, for cubers.
            </p>
          </div>

          {/* Feedback */}
          <div>
            <FeedbackModal />
          </div>

          {/* Links */}
          <div className="flex flex-col gap-1 text-xs text-muted-foreground/60">
            <Link href="/privacy" className="hover:text-muted-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-muted-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-border/30 pt-4 text-center text-xs text-muted-foreground/60">
          &copy; {new Date().getFullYear()} Brandon True
        </div>
      </div>
    </footer>
  )
}
