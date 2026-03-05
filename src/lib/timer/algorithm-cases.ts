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

const PLL_CASES: AlgorithmCase[] = [
  { index: 0, name: "H", group: "Permutation" },
  { index: 1, name: "Ua", group: "Permutation" },
  { index: 2, name: "Ub", group: "Permutation" },
  { index: 3, name: "Z", group: "Permutation" },
  { index: 4, name: "Aa", group: "Permutation" },
  { index: 5, name: "Ab", group: "Permutation" },
  { index: 6, name: "E", group: "Permutation" },
  { index: 7, name: "F", group: "Permutation" },
  { index: 8, name: "Ga", group: "Permutation" },
  { index: 9, name: "Gb", group: "Permutation" },
  { index: 10, name: "Gc", group: "Permutation" },
  { index: 11, name: "Gd", group: "Permutation" },
  { index: 12, name: "Ja", group: "Permutation" },
  { index: 13, name: "Jb", group: "Permutation" },
  { index: 14, name: "Na", group: "Permutation" },
  { index: 15, name: "Nb", group: "Permutation" },
  { index: 16, name: "Ra", group: "Permutation" },
  { index: 17, name: "Rb", group: "Permutation" },
  { index: 18, name: "T", group: "Permutation" },
  { index: 19, name: "V", group: "Permutation" },
  { index: 20, name: "Y", group: "Permutation" },
]

// ---- OLL (57 cases) ----
// Standard OLL numbering

const OLL_CASES: AlgorithmCase[] = Array.from({ length: 57 }, (_, i) => ({
  index: i,
  name: `OLL ${i + 1}`,
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
