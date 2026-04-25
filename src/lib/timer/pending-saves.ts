"use client"

import { saveTimerSession } from "@/lib/actions/save-timer-session"

const DB_NAME = "speed-cube-hub-pending-saves"
const DB_VERSION = 1
const STORE_NAME = "pending_saves"

type SaveTimerSessionInput = Parameters<typeof saveTimerSession>[0]

export type PendingSave = {
  id: string
  payload: SaveTimerSessionInput
  queuedAt: number
  attempts: number
  lastError: string | null
}

type Listener = (count: number) => void

const listeners = new Set<Listener>()
let cachedCount = 0

function supportsIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!supportsIndexedDb()) {
    return Promise.reject(new Error("IndexedDB unavailable"))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function notifyListeners(count: number) {
  cachedCount = count
  listeners.forEach((cb) => cb(count))
}

async function refreshCount(): Promise<number> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, "readonly")
    const count = await requestToPromise(tx.objectStore(STORE_NAME).count())
    await transactionDone(tx)
    notifyListeners(count)
    return count
  } catch {
    notifyListeners(0)
    return 0
  }
}

export async function listPendingSaves(): Promise<PendingSave[]> {
  if (!supportsIndexedDb()) return []
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, "readonly")
    const all = await requestToPromise(tx.objectStore(STORE_NAME).getAll() as IDBRequest<PendingSave[]>)
    await transactionDone(tx)
    return all.sort((a, b) => a.queuedAt - b.queuedAt)
  } catch {
    return []
  }
}

export async function getPendingCount(): Promise<number> {
  return refreshCount()
}

export function getCachedPendingCount(): number {
  return cachedCount
}

export function subscribePendingCount(cb: Listener): () => void {
  listeners.add(cb)
  cb(cachedCount)
  refreshCount()
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Adds a session-save payload to the offline queue. Caller is expected to have
 * already attached a stable client_session_id to the payload so retries are
 * idempotent on the server.
 */
export async function enqueueSave(payload: SaveTimerSessionInput): Promise<PendingSave> {
  if (!supportsIndexedDb()) {
    throw new Error("Offline saves require IndexedDB, which is unavailable in this browser.")
  }
  const entry: PendingSave = {
    id: generateId(),
    payload,
    queuedAt: Date.now(),
    attempts: 0,
    lastError: null,
  }
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).put(entry)
  await transactionDone(tx)
  await refreshCount()
  return entry
}

async function removeEntry(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).delete(id)
  await transactionDone(tx)
}

async function updateEntry(entry: PendingSave): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  tx.objectStore(STORE_NAME).put(entry)
  await transactionDone(tx)
}

export type FlushResult = {
  succeeded: number
  failed: number
  remaining: number
}

let flushInFlight: Promise<FlushResult> | null = null

/**
 * Drains the queue oldest-first. Successful entries are removed; failed entries
 * stay queued with attempts/lastError updated. Concurrent calls share the same
 * in-flight flush so spamming the retry button is safe.
 */
export async function flushPendingSaves(): Promise<FlushResult> {
  if (flushInFlight) return flushInFlight
  flushInFlight = (async () => {
    let succeeded = 0
    let failed = 0
    const entries = await listPendingSaves()

    for (const entry of entries) {
      // Bail out of the flush loop if the network drops mid-drain — leftover
      // entries stay queued and will retry on the next 'online' event.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        failed += entries.length - succeeded - failed
        break
      }

      try {
        const result = await saveTimerSession(entry.payload)
        if (result.error) {
          failed += 1
          await updateEntry({
            ...entry,
            attempts: entry.attempts + 1,
            lastError: result.error,
          })
        } else {
          succeeded += 1
          await removeEntry(entry.id)
        }
      } catch (err) {
        failed += 1
        await updateEntry({
          ...entry,
          attempts: entry.attempts + 1,
          lastError: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    const remaining = await refreshCount()
    return { succeeded, failed, remaining }
  })()

  try {
    return await flushInFlight
  } finally {
    flushInFlight = null
  }
}

export function generateClientSessionId(): string {
  return generateId()
}
