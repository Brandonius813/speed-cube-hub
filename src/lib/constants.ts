export const WCA_EVENTS = [
  { id: "333", label: "3x3", category: "NxN" },
  { id: "222", label: "2x2", category: "NxN" },
  { id: "444", label: "4x4", category: "NxN" },
  { id: "555", label: "5x5", category: "NxN" },
  { id: "666", label: "6x6", category: "NxN" },
  { id: "777", label: "7x7", category: "NxN" },
  { id: "333bf", label: "3x3 BLD", category: "Blindfolded" },
  { id: "333fm", label: "FMC", category: "Fewest Moves" },
  { id: "333oh", label: "OH", category: "One-Handed" },
  { id: "minx", label: "Megaminx", category: "Other" },
  { id: "pyram", label: "Pyraminx", category: "Other" },
  { id: "clock", label: "Clock", category: "Other" },
  { id: "skewb", label: "Skewb", category: "Other" },
  { id: "sq1", label: "Square-1", category: "Other" },
  { id: "444bf", label: "4x4 BLD", category: "Blindfolded" },
  { id: "555bf", label: "5x5 BLD", category: "Blindfolded" },
  { id: "333mbf", label: "Multi-BLD", category: "Blindfolded" },
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

/**
 * Common practice types shown for every event.
 */
const COMMON_PRACTICE_TYPES = ["Solves", "Slow Solves", "Comp Sim"]

/**
 * Event-specific practice types shown in addition to the common ones.
 */
const EVENT_SPECIFIC_PRACTICE_TYPES: Record<string, string[]> = {
  "222": ["Drill CLL", "Drill EG", "Drill Ortega"],
  "333": ["Drill OLL", "Drill PLL", "Drill F2L", "Cross Practice"],
  "444": ["Drill Parity", "Yau Practice"],
  "555": ["Reduction Practice"],
  "666": ["Reduction Practice"],
  "777": ["Reduction Practice"],
  "333bf": ["Memo Practice", "Execution Practice"],
  "444bf": ["Memo Practice", "Execution Practice"],
  "555bf": ["Memo Practice", "Execution Practice"],
  "333mbf": ["Memo Practice", "Execution Practice"],
  "333oh": ["Drill OLL", "Drill PLL", "Drill F2L"],
  minx: ["Drill Last Layer"],
  pyram: ["Drill L4E", "Drill Tips"],
  clock: [],
  skewb: ["Drill Algs"],
  sq1: ["Drill Cubeshape", "Drill Parity"],
  "333fm": ["Practice Insertions"],
}

/**
 * Returns the full list of practice types for a given event.
 * Common types first, then event-specific ones.
 */
export function getPracticeTypesForEvent(eventId: string): string[] {
  const specific = EVENT_SPECIFIC_PRACTICE_TYPES[eventId] ?? []
  return [...COMMON_PRACTICE_TYPES, ...specific]
}

/**
 * PB types available per event.
 * Most events use Single + averages. BLD/FMC use Single + Mo3.
 * 6x6/7x7 use Mo3 instead of Ao5 (WCA format).
 */
const DEFAULT_PB_TYPES = ["Single", "Ao5", "Ao12", "Ao50", "Ao100"]

const EVENT_PB_TYPES: Record<string, string[]> = {
  "333": ["Single", "Ao5", "Ao12", "Ao50", "Ao100", "Ao200", "Ao1000"],
  "444": ["Single", "Ao5", "Ao12", "Ao25", "Ao50", "Ao100"],
  "555": ["Single", "Ao5", "Ao12", "Ao25", "Ao50", "Ao100"],
  "666": ["Single", "Ao5", "Mo3", "Ao12", "Ao50", "Ao100"],
  "777": ["Single", "Ao5", "Mo3", "Ao12", "Ao50", "Ao100"],
  "333bf": ["Single", "Mo3"],
  "444bf": ["Single", "Mo3"],
  "555bf": ["Single", "Mo3"],
  "333mbf": ["Single"],
  "333fm": ["Single", "Mo3"],
}

/**
 * Returns the PB types available for a given event.
 */
export function getPBTypesForEvent(eventId: string): string[] {
  return EVENT_PB_TYPES[eventId] ?? DEFAULT_PB_TYPES
}

/**
 * Shared color palette for event charts/visualizations.
 * Used by event-pie-chart, daily-bar-chart, time-by-event-chart, etc.
 */
export const EVENT_COLORS: Record<string, string> = {
  "222": "#22D3EE",
  "333": "#EF4444",
  "444": "#6366F1",
  "555": "#F97316",
  "666": "#10B981",
  "777": "#EC4899",
  "333bf": "#8B5CF6",
  "444bf": "#A78BFA",
  "555bf": "#C4B5FD",
  "333mbf": "#7C3AED",
  "333oh": "#F59E0B",
  minx: "#A855F7",
  pyram: "#14B8A6",
  clock: "#06B6D4",
  skewb: "#F97316",
  sq1: "#6366F1",
  "333fm": "#84CC16",
}

/**
 * Helper to get event label by ID.
 */
export function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label ?? eventId
}

/**
 * Default total seconds per solve for csTimer imports.
 * Includes inspection, scrambling, picking up the cube, and rest between solves.
 * Roughly 2-3x the actual solve time. Users can adjust before importing.
 */
export const DEFAULT_SECONDS_PER_SOLVE: Record<string, number> = {
  "222": 15,
  "333": 30,
  "444": 75,
  "555": 120,
  "666": 195,
  "777": 270,
  "333bf": 120,
  "444bf": 360,
  "555bf": 600,
  "333mbf": 600,
  "333oh": 40,
  minx: 120,
  pyram: 20,
  clock: 25,
  skewb: 20,
  sq1: 45,
  "333fm": 3600,
}
