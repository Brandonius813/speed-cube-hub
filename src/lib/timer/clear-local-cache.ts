"use client"

const TIMER_DB = "speed-cube-hub-timer-v2"
const PENDING_SAVES_DB = "speed-cube-hub-pending-saves"
const SESSION_GROUPS_PREFIX = "timer-session-groups-"

function deleteIndexedDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve()
    const req = indexedDB.deleteDatabase(name)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

/**
 * Wipes the timer's locally-cached solve data on this device. The DB stays untouched —
 * on next page load the timer pulls solves back down from Supabase. Use this to recover
 * from corrupted local state (phantom duplicates, missing groups, wrong session counts).
 */
export async function clearLocalTimerCache(): Promise<void> {
  await Promise.all([deleteIndexedDb(TIMER_DB), deleteIndexedDb(PENDING_SAVES_DB)])

  try {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(SESSION_GROUPS_PREFIX)) toRemove.push(key)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {}
}
