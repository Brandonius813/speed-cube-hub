import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CompareProfileButton({
  handle,
}: {
  handle: string
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className="min-h-9 gap-1.5 border-border/50"
    >
      <Link href={`/profile/${handle}/compare`}>Compare With Me</Link>
    </Button>
  )
}
