import Link from "next/link";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Timer className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          <span className="text-sm font-semibold text-foreground sm:text-lg">
            SpeedCubeHub
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            href="/dashboard"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Dashboard
          </Link>
          <Link
            href="/profile"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Profile
          </Link>
          <Link href="/log">
            <Button
              size="sm"
              className="bg-primary text-xs text-primary-foreground hover:bg-primary/90 sm:text-sm"
            >
              Log Session
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
