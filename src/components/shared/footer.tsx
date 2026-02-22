import { Box } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/50 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Box className="h-4 w-4" />
          <span className="text-sm">Speed Cube Hub</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Built for cubers, by cubers.
        </p>
      </div>
    </footer>
  );
}
