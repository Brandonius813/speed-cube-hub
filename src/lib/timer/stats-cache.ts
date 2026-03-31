/**
 * IndexedDB cache for all-time timer stats (server responses).
 * Uses stale-while-revalidate: display cached data instantly,
 * refresh from server in background.
 */

const DB_NAME = "speed-cube-hub-stats-cache-v1"
const DB_VERSION = 1
const STORE_NAME = "cache"

type CacheRecord = {
  key: string
  data: string // JSON-serialized server response
  cachedAt: number
}

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

async function openDb(): Promise<IDBDatabase> {
  if (!supportsIndexedDb()) {
    throw new Error("IndexedDB unavailable")
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "key" })
    }
  }
  return requestToPromise(request)
}

/**
 * Read a cached server response from IndexedDB.
 * Returns null if not cached or IndexedDB is unavailable.
 */
export async function getCachedStats<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const record = await requestToPromise(store.get(key)) as CacheRecord | undefined
    db.close()
    if (!record) return null
    return JSON.parse(record.data) as T
  } catch {
    return null
  }
}

/**
 * Write a server response to the IndexedDB cache.
 */
export async function setCachedStats<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    const record: CacheRecord = {
      key,
      data: JSON.stringify(data),
      cachedAt: Date.now(),
    }
    store.put(record)
    await transactionDone(tx)
    db.close()
  } catch {
    // Cache write failure is non-critical
  }
}

/**
 * Invalidate cached stats. If event is provided, only that event's
 * entries are deleted. Otherwise the entire cache is cleared.
 */
export async function invalidateStatsCache(event?: string): Promise<void> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    if (event) {
      store.delete(`analytics:${event}`)
      store.delete(`solveListSummary:${event}`)
    } else {
      store.clear()
    }
    await transactionDone(tx)
    db.close()
  } catch {
    // Cache invalidation failure is non-critical
  }
}
