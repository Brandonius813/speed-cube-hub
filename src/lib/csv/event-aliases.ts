import { WCA_EVENTS } from "@/lib/constants";

/**
 * Manual aliases for common ways cubers refer to events.
 * The auto-generated aliases from WCA_EVENTS (id + lowercase label) are added below.
 */
const MANUAL_ALIASES: Record<string, string> = {
  // NxN variations
  "2x2x2": "222",
  "3x3x3": "333",
  "4x4x4": "444",
  "5x5x5": "555",
  "6x6x6": "666",
  "7x7x7": "777",

  // Blindfolded
  "3bld": "333bf",
  "3x3 blindfolded": "333bf",
  "4bld": "444bf",
  "4x4 blindfolded": "444bf",
  "5bld": "555bf",
  "5x5 blindfolded": "555bf",
  "mbld": "333mbf",
  "multi bld": "333mbf",
  "multi-bld": "333mbf",
  "multiblind": "333mbf",

  // One-handed
  oh: "333oh",
  "one-handed": "333oh",
  "one handed": "333oh",

  // Other
  mega: "minx",
  megaminx: "minx",
  pyra: "pyram",
  pyraminx: "pyram",
  "square-1": "sq1",
  square1: "sq1",
  "sq-1": "sq1",

  // FMC
  fmc: "333fm",
  "fewest moves": "333fm",
};

// Build full alias map: manual aliases + auto-generated from WCA_EVENTS
const EVENT_ALIAS_MAP: Record<string, string> = { ...MANUAL_ALIASES };

for (const event of WCA_EVENTS) {
  EVENT_ALIAS_MAP[event.id] = event.id;
  EVENT_ALIAS_MAP[event.label.toLowerCase()] = event.id;
}

/**
 * Resolves a user-typed event string to a valid WCA event ID.
 * Returns null if no match is found.
 */
export function resolveEventId(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  return EVENT_ALIAS_MAP[normalized] ?? null;
}

/**
 * Returns the display label for a WCA event ID (e.g., "333" → "3x3").
 */
export function getEventLabel(eventId: string): string {
  return WCA_EVENTS.find((e) => e.id === eventId)?.label ?? eventId;
}
