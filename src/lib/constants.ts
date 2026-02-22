export const WCA_EVENTS = [
  // NxN
  { id: "222", label: "2x2", category: "NxN" },
  { id: "333", label: "3x3", category: "NxN" },
  { id: "444", label: "4x4", category: "NxN" },
  { id: "555", label: "5x5", category: "NxN" },
  { id: "666", label: "6x6", category: "NxN" },
  { id: "777", label: "7x7", category: "NxN" },
  // Blindfolded
  { id: "333bf", label: "3x3 BLD", category: "Blindfolded" },
  { id: "444bf", label: "4x4 BLD", category: "Blindfolded" },
  { id: "555bf", label: "5x5 BLD", category: "Blindfolded" },
  { id: "333mbf", label: "Multi-BLD", category: "Blindfolded" },
  // One-Handed
  { id: "333oh", label: "3x3 OH", category: "One-Handed" },
  // Other
  { id: "minx", label: "Megaminx", category: "Other" },
  { id: "pyram", label: "Pyraminx", category: "Other" },
  { id: "clock", label: "Clock", category: "Other" },
  { id: "skewb", label: "Skewb", category: "Other" },
  { id: "sq1", label: "Square-1", category: "Other" },
  // Fewest Moves
  { id: "333fm", label: "FMC", category: "Fewest Moves" },
] as const

export type WcaEvent = (typeof WCA_EVENTS)[number]
export type WcaEventId = WcaEvent["id"]

export const PRACTICE_TYPES = [
  "Solves",
  "Drill Algs",
  "Slow Solves",
  "Comp Sim",
] as const

export type PracticeType = (typeof PRACTICE_TYPES)[number]
