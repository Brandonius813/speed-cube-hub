import { cn } from "@/lib/utils"

/**
 * Renders a WCA event icon from the @cubing/icons font.
 * Pass the WCA event ID (e.g. "333", "pyram", "minx") as the `event` prop.
 */
export function CubingIcon({
  event,
  className,
}: {
  event: string
  className?: string
}) {
  return (
    <span
      className={cn("cubing-icon", `event-${event}`, className)}
      aria-hidden="true"
    />
  )
}
