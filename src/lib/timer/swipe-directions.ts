/**
 * Swipe direction detection for 8-directional mobile gestures.
 * Used by the timer display to map swipe gestures to solve actions.
 */

export type SwipeDirection =
  | "up"
  | "up-right"
  | "right"
  | "down-right"
  | "down"
  | "down-left"
  | "left"
  | "up-left"

/** Minimum distance in pixels to count as a swipe (not a tap) */
export const SWIPE_THRESHOLD = 40

/**
 * Labels shown during the swipe gesture to indicate what action will fire.
 */
export const SWIPE_LABELS: Record<SwipeDirection, string> = {
  up: "+2",
  "up-right": "OK",
  "up-left": "DNF",
  left: "Undo",
  right: "Skip",
  "down-left": "Note",
  down: "Delete",
  "down-right": "Inspect",
}

/**
 * Compute 8-direction from a touch delta.
 * Angle is measured clockwise from up (negative y-axis).
 * Returns null if the distance is below threshold.
 */
export function getSwipeDirection(
  dx: number,
  dy: number
): SwipeDirection | null {
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < SWIPE_THRESHOLD) return null

  // Angle in degrees, clockwise from up (0° = up, 90° = right, etc.)
  let angle = Math.atan2(dx, -dy) * (180 / Math.PI)
  if (angle < 0) angle += 360

  // Each sector is 45° wide, centered on the direction
  if (angle >= 337.5 || angle < 22.5) return "up"
  if (angle >= 22.5 && angle < 67.5) return "up-right"
  if (angle >= 67.5 && angle < 112.5) return "right"
  if (angle >= 112.5 && angle < 157.5) return "down-right"
  if (angle >= 157.5 && angle < 202.5) return "down"
  if (angle >= 202.5 && angle < 247.5) return "down-left"
  if (angle >= 247.5 && angle < 292.5) return "left"
  return "up-left" // 292.5 - 337.5
}
