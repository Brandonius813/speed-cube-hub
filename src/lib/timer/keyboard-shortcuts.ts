/**
 * Configurable keyboard shortcuts for the timer.
 *
 * Defaults mirror csTimer conventions (Ctrl+2, Ctrl+3, Enter, Alt+Z).
 * Users can remap shortcuts via the timer settings panel.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShortcutAction =
  | "toggle-plus2"
  | "toggle-dnf"
  | "next-scramble"
  | "delete-last-solve"

export type ShortcutBinding = {
  key: string // e.g. "2", "Enter", "z" — always lowercase
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  meta?: boolean
}

export type ShortcutMap = Record<ShortcutAction, ShortcutBinding>

// ---------------------------------------------------------------------------
// Labels (for settings UI)
// ---------------------------------------------------------------------------

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  "toggle-plus2": "+2 Penalty",
  "toggle-dnf": "DNF",
  "next-scramble": "Next Scramble",
  "delete-last-solve": "Delete Last Solve",
}

// Ordered list for consistent rendering
export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  "toggle-plus2",
  "toggle-dnf",
  "next-scramble",
  "delete-last-solve",
]

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function getDefaultShortcutMap(): ShortcutMap {
  return {
    "toggle-plus2": { key: "2", ctrl: true },
    "toggle-dnf": { key: "3", ctrl: true },
    "next-scramble": { key: "enter" },
    "delete-last-solve": { key: "z", alt: true },
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "timer-shortcut-map"

export function loadShortcutMap(): ShortcutMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ShortcutMap>
      // Merge with defaults so new actions always have a binding
      return { ...getDefaultShortcutMap(), ...parsed }
    }
  } catch {}
  return getDefaultShortcutMap()
}

export function saveShortcutMap(map: ShortcutMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {}
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export function matchShortcut(
  e: KeyboardEvent,
  map: ShortcutMap,
): ShortcutAction | null {
  const key = e.key.toLowerCase()
  for (const action of SHORTCUT_ACTIONS) {
    const b = map[action]
    if (
      key === b.key &&
      e.ctrlKey === !!b.ctrl &&
      e.altKey === !!b.alt &&
      e.shiftKey === !!b.shift &&
      e.metaKey === !!b.meta
    ) {
      return action
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function formatBinding(b: ShortcutBinding): string {
  const parts: string[] = []
  if (b.ctrl) parts.push("Ctrl")
  if (b.alt) parts.push("Alt")
  if (b.shift) parts.push("Shift")
  if (b.meta) parts.push("Cmd")

  // Pretty-print special keys
  const label =
    b.key === "enter"
      ? "Enter"
      : b.key === "backspace"
      ? "Backspace"
      : b.key === "delete"
      ? "Delete"
      : b.key === "escape"
      ? "Esc"
      : b.key === "arrowup"
      ? "↑"
      : b.key === "arrowdown"
      ? "↓"
      : b.key === "arrowleft"
      ? "←"
      : b.key === "arrowright"
      ? "→"
      : b.key.length === 1
      ? b.key.toUpperCase()
      : b.key

  parts.push(label)
  return parts.join("+")
}

/** Convert a KeyboardEvent into a ShortcutBinding (for the rebind capture). */
export function bindingFromEvent(e: KeyboardEvent): ShortcutBinding | null {
  const key = e.key.toLowerCase()
  // Ignore bare modifier keys
  if (["control", "alt", "shift", "meta"].includes(key)) return null
  // Block Space — reserved for timer start/stop
  if (key === " " || e.code === "Space") return null

  return {
    key,
    ...(e.ctrlKey && { ctrl: true }),
    ...(e.altKey && { alt: true }),
    ...(e.shiftKey && { shift: true }),
    ...(e.metaKey && { meta: true }),
  }
}
