/**
 * Training scramble type definitions for the timer.
 *
 * Each training scramble type maps to a cstimer_module scramble type string.
 * Types are grouped by parent WCA event (e.g., 3x3 training types appear
 * when the user's session event is "333").
 *
 * The cstimer_module generates scrambles that set up specific cases:
 * - PLL: F2L + OLL solved, need to permute last layer
 * - OLL: F2L solved, need to orient last layer
 * - F2L: Cross solved, need to insert F2L pairs
 * - Last Layer: F2L solved, need to solve entire last layer
 * - LSLL: 3 F2L pairs solved, need last slot + last layer
 * - Easy Cross: Scramble where cross is solvable in few moves
 */

export type TrainingScrambleType = {
  /** Unique identifier for this training type */
  id: string
  /** Display label shown in the selector */
  label: string
  /** Short description of what this trains */
  description: string
  /** The cstimer_module scramble type string */
  cstimerType: string
  /** Category for grouping in the UI */
  category: "cfop" | "roux" | "advanced" | "subset" | "other"
}

/** "Normal" means use the standard event scramble — no training override */
export const NORMAL_SCRAMBLE_ID = "normal"

/**
 * Training scramble types available per WCA event.
 * Only events with training types are listed here.
 */
export const TRAINING_SCRAMBLE_TYPES: Record<string, TrainingScrambleType[]> = {
  // 3x3 CFOP Core (T116)
  "333": [
    {
      id: "pll",
      label: "PLL",
      description: "Last layer permutation (21 cases)",
      cstimerType: "pll",
      category: "cfop",
    },
    {
      id: "oll",
      label: "OLL",
      description: "Last layer orientation (57 cases)",
      cstimerType: "oll",
      category: "cfop",
    },
    {
      id: "ll",
      label: "Last Layer",
      description: "Full last layer (OLL + PLL)",
      cstimerType: "ll",
      category: "cfop",
    },
    {
      id: "f2l",
      label: "F2L",
      description: "Cross solved, insert F2L pairs",
      cstimerType: "f2l",
      category: "cfop",
    },
    {
      id: "lsll",
      label: "LSLL",
      description: "Last slot + last layer",
      cstimerType: "lsll2",
      category: "cfop",
    },
  ],

  // 3x3 One-Handed uses same training types as 3x3
  "333oh": [
    {
      id: "pll",
      label: "PLL",
      description: "Last layer permutation (21 cases)",
      cstimerType: "pll",
      category: "cfop",
    },
    {
      id: "oll",
      label: "OLL",
      description: "Last layer orientation (57 cases)",
      cstimerType: "oll",
      category: "cfop",
    },
    {
      id: "ll",
      label: "Last Layer",
      description: "Full last layer (OLL + PLL)",
      cstimerType: "ll",
      category: "cfop",
    },
    {
      id: "f2l",
      label: "F2L",
      description: "Cross solved, insert F2L pairs",
      cstimerType: "f2l",
      category: "cfop",
    },
    {
      id: "lsll",
      label: "LSLL",
      description: "Last slot + last layer",
      cstimerType: "lsll2",
      category: "cfop",
    },
  ],
}

/**
 * Get training scramble types for a given event.
 * Returns empty array if the event has no training types.
 */
export function getTrainingTypes(eventId: string): TrainingScrambleType[] {
  return TRAINING_SCRAMBLE_TYPES[eventId] ?? []
}

/**
 * Find a training type by ID for a given event.
 */
export function getTrainingType(
  eventId: string,
  typeId: string
): TrainingScrambleType | null {
  if (typeId === NORMAL_SCRAMBLE_ID) return null
  return getTrainingTypes(eventId).find((t) => t.id === typeId) ?? null
}

/**
 * Check if an event has any training scramble types available.
 */
export function hasTrainingTypes(eventId: string): boolean {
  return (TRAINING_SCRAMBLE_TYPES[eventId]?.length ?? 0) > 0
}
