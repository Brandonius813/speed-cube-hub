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

export type TrainingCategory =
  | "cfop"
  | "advanced"
  | "roux"
  | "mehta"
  | "subset"
  | "other"

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
  category: TrainingCategory
}

/** "Normal" means use the standard event scramble — no training override */
export const NORMAL_SCRAMBLE_ID = "normal"

/** Display labels for categories */
export const CATEGORY_LABELS: Record<TrainingCategory, string> = {
  cfop: "CFOP",
  advanced: "Advanced",
  roux: "Roux",
  mehta: "Mehta",
  subset: "Subsets",
  other: "Other",
}

// ---- Shared type arrays (3x3 and 3x3 OH share CFOP/Advanced/Roux/Mehta/Subset) ----

const CFOP_TYPES: TrainingScrambleType[] = [
  { id: "pll", label: "PLL", description: "Last layer permutation (21 cases)", cstimerType: "pll", category: "cfop" },
  { id: "oll", label: "OLL", description: "Last layer orientation (57 cases)", cstimerType: "oll", category: "cfop" },
  { id: "ll", label: "Last Layer", description: "Full last layer (OLL + PLL)", cstimerType: "ll", category: "cfop" },
  { id: "f2l", label: "F2L", description: "Cross solved, insert F2L pairs", cstimerType: "f2l", category: "cfop" },
  { id: "lsll", label: "LSLL", description: "Last slot + last layer", cstimerType: "lsll2", category: "cfop" },
  { id: "easyc", label: "Easy Cross", description: "Cross solvable in few moves", cstimerType: "easyc", category: "cfop" },
  { id: "easyxc", label: "Easy XCross", description: "Easy cross + one F2L pair", cstimerType: "easyxc", category: "cfop" },
]

const ADVANCED_TYPES: TrainingScrambleType[] = [
  { id: "zbll", label: "ZBLL", description: "ZZ last layer (all edges oriented)", cstimerType: "zbll", category: "advanced" },
  { id: "coll", label: "COLL", description: "Corner OLL (edges oriented)", cstimerType: "coll", category: "advanced" },
  { id: "cll", label: "CLL", description: "Corner last layer", cstimerType: "cll", category: "advanced" },
  { id: "ell", label: "ELL", description: "Edge last layer (corners solved)", cstimerType: "ell", category: "advanced" },
  { id: "2gll", label: "2GLL", description: "2-generator last layer", cstimerType: "2gll", category: "advanced" },
  { id: "zzll", label: "ZZLL", description: "ZZ last layer", cstimerType: "zzll", category: "advanced" },
  { id: "zbls", label: "ZBLS", description: "ZZ last slot (orient edges)", cstimerType: "zbls", category: "advanced" },
  { id: "eols", label: "EOLS", description: "Edge-oriented last slot", cstimerType: "eols", category: "advanced" },
  { id: "wvls", label: "WVLS", description: "Winter Variation last slot", cstimerType: "wvls", category: "advanced" },
  { id: "vls", label: "VLS", description: "Void last slot", cstimerType: "vls", category: "advanced" },
  { id: "eoline", label: "EOLine", description: "Edge orientation + line", cstimerType: "eoline", category: "advanced" },
]

const ROUX_TYPES: TrainingScrambleType[] = [
  { id: "sb", label: "2nd Block", description: "First block solved, build second", cstimerType: "sbrx", category: "roux" },
  { id: "cmll", label: "CMLL", description: "Corners of M-slice last layer", cstimerType: "cmll", category: "roux" },
  { id: "lse", label: "LSE", description: "Last six edges", cstimerType: "lse", category: "roux" },
  { id: "lsemu", label: "LSE <M,U>", description: "LSE with M and U moves only", cstimerType: "lsemu", category: "roux" },
]

const MEHTA_TYPES: TrainingScrambleType[] = [
  { id: "mt3qb", label: "3QB", description: "3 quarters of a block", cstimerType: "mt3qb", category: "mehta" },
  { id: "mteole", label: "EOLE", description: "Edge orientation + last edge", cstimerType: "mteole", category: "mehta" },
  { id: "mttdr", label: "TDR", description: "Tripod DRUD", cstimerType: "mttdr", category: "mehta" },
  { id: "mt6cp", label: "6CP", description: "6-cycle permutation", cstimerType: "mt6cp", category: "mehta" },
  { id: "mtcdrll", label: "CDRLL", description: "CDRLL step", cstimerType: "mtcdrll", category: "mehta" },
  { id: "mtl5ep", label: "L5EP", description: "Last 5 edge permutation", cstimerType: "mtl5ep", category: "mehta" },
  { id: "ttll", label: "TTLL", description: "TTLL step", cstimerType: "ttll", category: "mehta" },
]

const SUBSET_TYPES: TrainingScrambleType[] = [
  { id: "2gen", label: "2-gen <R,U>", description: "R and U moves only", cstimerType: "2gen", category: "subset" },
  { id: "2genl", label: "2-gen <L,U>", description: "L and U moves only", cstimerType: "2genl", category: "subset" },
  { id: "roux-gen", label: "Roux-gen <M,U>", description: "M and U moves only", cstimerType: "roux", category: "subset" },
  { id: "3gen-fru", label: "3-gen <F,R,U>", description: "F, R, and U moves only", cstimerType: "3gen_F", category: "subset" },
  { id: "3gen-rul", label: "3-gen <R,U,L>", description: "R, U, and L moves only", cstimerType: "3gen_L", category: "subset" },
  { id: "3gen-rru", label: "3-gen <R,r,U>", description: "R, r, and U moves only", cstimerType: "RrU", category: "subset" },
  { id: "half", label: "Half Turns", description: "180-degree turns only", cstimerType: "half", category: "subset" },
  { id: "edges", label: "Edges Only", description: "Only edges scrambled", cstimerType: "edges", category: "subset" },
  { id: "corners", label: "Corners Only", description: "Only corners scrambled", cstimerType: "corners", category: "subset" },
]

/**
 * Training scramble types available per WCA event.
 * Only events with training types are listed here.
 */
export const TRAINING_SCRAMBLE_TYPES: Record<string, TrainingScrambleType[]> = {
  // 3x3 — all training categories
  "333": [
    ...CFOP_TYPES,
    ...ADVANCED_TYPES,
    ...ROUX_TYPES,
    ...MEHTA_TYPES,
    ...SUBSET_TYPES,
  ],

  // 3x3 One-Handed shares all 3x3 training types
  "333oh": [
    ...CFOP_TYPES,
    ...ADVANCED_TYPES,
    ...ROUX_TYPES,
    ...MEHTA_TYPES,
    ...SUBSET_TYPES,
  ],

  // 2x2 training (T120)
  "222": [
    { id: "222eg", label: "EG", description: "EG method (all cases)", cstimerType: "222eg", category: "other" },
    { id: "222eg0", label: "CLL", description: "Corner last layer (face solved)", cstimerType: "222eg0", category: "other" },
    { id: "222eg1", label: "EG-1", description: "EG-1 (bar on bottom)", cstimerType: "222eg1", category: "other" },
    { id: "222eg2", label: "EG-2", description: "EG-2 (opposite on bottom)", cstimerType: "222eg2", category: "other" },
    { id: "222tc", label: "TCLL", description: "TCLL (all cases)", cstimerType: "222tc", category: "other" },
    { id: "222tcp", label: "TCLL+", description: "TCLL with bar", cstimerType: "222tcp", category: "other" },
    { id: "222tcn", label: "TCLL-", description: "TCLL without bar", cstimerType: "222tcn", category: "other" },
    { id: "222lsall", label: "LS", description: "Last slot training", cstimerType: "222lsall", category: "other" },
    { id: "222nb", label: "No Bar", description: "No bar on any face", cstimerType: "222nb", category: "other" },
  ],

  // 4x4 training (T121)
  "444": [
    { id: "4edge", label: "Edges", description: "Edge pairing only", cstimerType: "4edge", category: "other" },
    { id: "RrUu", label: "<R,r,U,u>", description: "R, r, U, u moves only", cstimerType: "RrUu", category: "subset" },
    { id: "444ll", label: "Last Layer", description: "4x4 last layer", cstimerType: "444ll", category: "other" },
    { id: "444ell", label: "ELL", description: "4x4 edge last layer", cstimerType: "444ell", category: "other" },
    { id: "444edo", label: "Edge Only", description: "Only edges scrambled", cstimerType: "444edo", category: "other" },
    { id: "444cto", label: "Center Only", description: "Only centers scrambled", cstimerType: "444cto", category: "other" },
    { id: "444ctud", label: "UD Centers", description: "UD centers solved (Yau start)", cstimerType: "444ctud", category: "other" },
    { id: "444ud3c", label: "UD+3E Solved", description: "UD centers + 3 cross edges solved", cstimerType: "444ud3c", category: "other" },
    { id: "444l8e", label: "Last 8 Edges", description: "Last 8 edges to pair", cstimerType: "444l8e", category: "other" },
    { id: "444ctrl", label: "RL Centers", description: "RL centers solved", cstimerType: "444ctrl", category: "other" },
  ],

  // 5x5 training
  "555": [
    { id: "5edge", label: "Edges", description: "Edge pairing only", cstimerType: "5edge", category: "other" },
  ],

  // 6x6 training
  "666": [
    { id: "6edge", label: "Edges", description: "Edge pairing only", cstimerType: "6edge", category: "other" },
  ],

  // 7x7 training
  "777": [
    { id: "7edge", label: "Edges", description: "Edge pairing only", cstimerType: "7edge", category: "other" },
  ],

  // Pyraminx training
  "pyram": [
    { id: "pyrl4e", label: "L4E", description: "Last 4 edges", cstimerType: "pyrl4e", category: "other" },
    { id: "pyrnb", label: "No Bar", description: "No bar on any face", cstimerType: "pyrnb", category: "other" },
  ],

  // Skewb training
  "skewb": [
    { id: "skbnb", label: "No Bar", description: "No bar on any face", cstimerType: "skbnb", category: "other" },
  ],

  // Square-1 training
  "sq1": [
    { id: "sqrcsp", label: "CSP", description: "Cubeshape permutation", cstimerType: "sqrcsp", category: "other" },
    { id: "sq1pll", label: "PLL", description: "Square-1 PLL", cstimerType: "sq1pll", category: "other" },
  ],

  // Megaminx training
  "minx": [
    { id: "minx2g", label: "2-gen <R,U>", description: "R and U moves only", cstimerType: "minx2g", category: "subset" },
    { id: "mlsll", label: "LSLL", description: "Last slot + last layer", cstimerType: "mlsll", category: "other" },
    { id: "mgmpll", label: "PLL", description: "Megaminx PLL", cstimerType: "mgmpll", category: "other" },
    { id: "mgmll", label: "Last Layer", description: "Megaminx last layer", cstimerType: "mgmll", category: "other" },
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

/**
 * Get unique categories present in an event's training types.
 */
export function getEventCategories(eventId: string): TrainingCategory[] {
  const types = getTrainingTypes(eventId)
  const seen = new Set<TrainingCategory>()
  const result: TrainingCategory[] = []
  for (const t of types) {
    if (!seen.has(t.category)) {
      seen.add(t.category)
      result.push(t.category)
    }
  }
  return result
}
