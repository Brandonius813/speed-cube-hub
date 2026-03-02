/**
 * Algorithm case definitions for training scramble filtering.
 *
 * Each training scramble type (PLL, OLL, etc.) has a set of individual cases.
 * The cstimer_module accepts a numeric case index as the third parameter
 * to generate a scramble for a specific case:
 *   getScramble('pll', 0, caseIndex)
 *
 * This file maps those numeric indices to human-readable case names.
 */

export type AlgorithmCase = {
  /** Numeric index used by cstimer_module */
  index: number
  /** Short name (e.g., "T", "Ua", "F2L-1") */
  name: string
  /** Optional group for visual organization */
  group?: string
}

export type AlgorithmCaseSet = {
  /** The cstimer training type this applies to (e.g., "pll") */
  cstimerType: string
  /** Human-readable name for this algorithm set */
  label: string
  /** Total number of cases */
  totalCases: number
  /** Individual case definitions */
  cases: AlgorithmCase[]
}

// ---- PLL (21 cases) ----
// Standard PLL naming, indices match cstimer order
// Groups: Edges-only (pure 3-cycle edges), Corners-only (pure 3-cycle corners),
//         H/Z (symmetric double swaps), Adjacent (cycle involves adjacent pieces),
//         Diagonal (cycle involves diagonal pieces)

const PLL_CASES: AlgorithmCase[] = [
  { index: 0,  name: "H",  group: "H/Z" },
  { index: 1,  name: "Ua", group: "Edges-only" },
  { index: 2,  name: "Ub", group: "Edges-only" },
  { index: 3,  name: "Z",  group: "H/Z" },
  { index: 4,  name: "Aa", group: "Corners-only" },
  { index: 5,  name: "Ab", group: "Corners-only" },
  { index: 6,  name: "E",  group: "Diagonal" },
  { index: 7,  name: "F",  group: "Adjacent" },
  { index: 8,  name: "Ga", group: "Adjacent" },
  { index: 9,  name: "Gb", group: "Adjacent" },
  { index: 10, name: "Gc", group: "Adjacent" },
  { index: 11, name: "Gd", group: "Adjacent" },
  { index: 12, name: "Ja", group: "Adjacent" },
  { index: 13, name: "Jb", group: "Adjacent" },
  { index: 14, name: "Na", group: "Diagonal" },
  { index: 15, name: "Nb", group: "Diagonal" },
  { index: 16, name: "Ra", group: "Adjacent" },
  { index: 17, name: "Rb", group: "Adjacent" },
  { index: 18, name: "T",  group: "Adjacent" },
  { index: 19, name: "V",  group: "Diagonal" },
  { index: 20, name: "Y",  group: "Diagonal" },
]

// ---- OLL (57 cases) ----
// Standard OLL numbering with shape-based groups.
// Groups describe the pattern of unoriented edge stickers visible from the top.

const OLL_GROUPS: string[] = [
  // 1-4: Dot (no edges oriented)
  "Dot", "Dot", "Dot", "Dot",
  // 5-6: Square (2-corner square pattern)
  "Square", "Square",
  // 7-10: Fish (Sune-based shapes)
  "Fish", "Fish", "Fish", "Fish",
  // 11-14: Lightning bolt shapes
  "Lightning", "Lightning", "Lightning", "Lightning",
  // 15-20: Headlights / small-L shapes
  "Headlights", "Headlights", "Headlights", "Headlights", "Headlights", "Headlights",
  // 21-27: Cross (all edges oriented — OCLL)
  "Cross", "Cross", "Cross", "Cross", "Cross", "Cross", "Cross",
  // 28-30: C-shape
  "C-shape", "C-shape", "C-shape",
  // 31-32: P-shape
  "P-shape", "P-shape",
  // 33: T-shape
  "T-shape",
  // 34-35: C-shape
  "C-shape", "C-shape",
  // 36-42: W-shape / miscellaneous
  "W-shape", "W-shape", "W-shape", "W-shape", "W-shape", "W-shape", "W-shape",
  // 43-44: S-shape
  "S-shape", "S-shape",
  // 45: T-shape
  "T-shape",
  // 46: Z-shape
  "Z-shape",
  // 47-50: L-shape
  "L-shape", "L-shape", "L-shape", "L-shape",
  // 51: Z-shape
  "Z-shape",
  // 52-57: Line (2 opposite edges oriented)
  "Line", "Line", "Line", "Line", "Line", "Line",
]

const OLL_CASES: AlgorithmCase[] = Array.from({ length: 57 }, (_, i) => ({
  index: i,
  name: `OLL ${i + 1}`,
  group: OLL_GROUPS[i],
}))

// ---- COLL (42 cases) ----

const COLL_CASES: AlgorithmCase[] = Array.from({ length: 42 }, (_, i) => ({
  index: i,
  name: `COLL ${i + 1}`,
}))

// ---- 2x2 CLL (42 cases) ----

const CLL_222_CASES: AlgorithmCase[] = Array.from({ length: 42 }, (_, i) => ({
  index: i,
  name: `CLL ${i + 1}`,
}))

// ---- 2x2 EG (42 cases per tier) ----

const EG_CASES: AlgorithmCase[] = Array.from({ length: 42 }, (_, i) => ({
  index: i,
  name: `EG ${i + 1}`,
}))

const EG1_CASES: AlgorithmCase[] = Array.from({ length: 42 }, (_, i) => ({
  index: i,
  name: `EG-1 ${i + 1}`,
}))

const EG2_CASES: AlgorithmCase[] = Array.from({ length: 42 }, (_, i) => ({
  index: i,
  name: `EG-2 ${i + 1}`,
}))

// ---- CMLL (42 cases) ----

const CMLL_CASES: AlgorithmCase[] = Array.from({ length: 42 }, (_, i) => ({
  index: i,
  name: `CMLL ${i + 1}`,
}))

/**
 * Registry of algorithm case sets, keyed by cstimer type string.
 * Only types with named individual cases are listed here.
 * If a type isn't here, case filtering isn't supported for it.
 */
export const ALGORITHM_CASE_SETS: Record<string, AlgorithmCaseSet> = {
  pll: { cstimerType: "pll", label: "PLL", totalCases: 21, cases: PLL_CASES },
  oll: { cstimerType: "oll", label: "OLL", totalCases: 57, cases: OLL_CASES },
  coll: { cstimerType: "coll", label: "COLL", totalCases: 42, cases: COLL_CASES },
  cll: { cstimerType: "cll", label: "CLL", totalCases: 42, cases: CLL_222_CASES },
  "222eg": { cstimerType: "222eg", label: "EG", totalCases: 42, cases: EG_CASES },
  "222eg0": { cstimerType: "222eg0", label: "CLL (2x2)", totalCases: 42, cases: CLL_222_CASES },
  "222eg1": { cstimerType: "222eg1", label: "EG-1", totalCases: 42, cases: EG1_CASES },
  "222eg2": { cstimerType: "222eg2", label: "EG-2", totalCases: 42, cases: EG2_CASES },
  cmll: { cstimerType: "cmll", label: "CMLL", totalCases: 42, cases: CMLL_CASES },
}

/**
 * Check if a training type supports case filtering.
 */
export function hasCaseFiltering(cstimerType: string): boolean {
  return cstimerType in ALGORITHM_CASE_SETS
}

/**
 * Get the case set for a training type, if it exists.
 */
export function getCaseSet(cstimerType: string): AlgorithmCaseSet | null {
  return ALGORITHM_CASE_SETS[cstimerType] ?? null
}
