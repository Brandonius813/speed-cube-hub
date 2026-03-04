import type { Penalty, TimerSolve } from "@/lib/timer/stats"

const DB_NAME = "speed-cube-hub-timer"
const DB_VERSION = 1
const STORE_NAME = "solves"
const INDEX_SESSION_ORDER = "by_session_order"

type SolveRecord = TimerSolve & {
  sessionId: string
  order: number
  updatedAt: number
  group?: string | null
}

type RequestResult<T> = Promise<T>

function requestToPromise<T>(request: IDBRequest<T>): RequestResult<T> {
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

function supportsIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window
}

async function openDb(): Promise<IDBDatabase> {
  if (!supportsIndexedDb()) {
    throw new Error("IndexedDB unavailable")
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
      store.createIndex(INDEX_SESSION_ORDER, ["sessionId", "order"], { unique: true })
    }
  }
  return requestToPromise(request)
}

function keyRangeForSession(sessionId: string): IDBKeyRange {
  return IDBKeyRange.bound(
    [sessionId, Number.MIN_SAFE_INTEGER],
    [sessionId, Number.MAX_SAFE_INTEGER]
  )
}

type MemoryStoreState = {
  bySession: Map<string, TimerSolve[]>
}

const memoryStore: MemoryStoreState = {
  bySession: new Map(),
}

export interface SolveStore {
  appendSolve(sessionId: string, solve: TimerSolve): Promise<void>
  updatePenalty(id: string, penalty: Penalty): Promise<void>
  deleteSolve(id: string): Promise<void>
  listWindow(sessionId: string, offset: number, limit: number): Promise<TimerSolve[]>
  count(sessionId: string): Promise<number>
  loadSession(sessionId: string): Promise<TimerSolve[]>
  replaceSession(sessionId: string, solves: TimerSolve[]): Promise<void>
  markGroup(sessionId: string, group: string): Promise<void>
  clearSession(sessionId: string): Promise<void>
  readonly storageMode: "indexeddb" | "memory"
  onFallback: ((reason: string) => void) | null
}

async function appendIndexedDbSolve(
  db: IDBDatabase,
  sessionId: string,
  solve: TimerSolve
): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  const index = store.index(INDEX_SESSION_ORDER)
  const cursorReq = index.openCursor(keyRangeForSession(sessionId), "prev")
  const cursor = await requestToPromise(cursorReq)
  const highestOrder = (cursor?.value as SolveRecord | undefined)?.order ?? 0

  store.put({
    ...solve,
    sessionId,
    order: highestOrder + 1,
    updatedAt: Date.now(),
  } satisfies SolveRecord)
  await transactionDone(tx)
}

async function loadIndexedDbSession(
  db: IDBDatabase,
  sessionId: string
): Promise<TimerSolve[]> {
  const tx = db.transaction(STORE_NAME, "readonly")
  const store = tx.objectStore(STORE_NAME)
  const index = store.index(INDEX_SESSION_ORDER)
  const rows: TimerSolve[] = []
  const req = index.openCursor(keyRangeForSession(sessionId), "next")

  await new Promise<void>((resolve, reject) => {
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve()
        return
      }
      const value = cursor.value as SolveRecord
      rows.push({
        id: value.id,
        time_ms: value.time_ms,
        penalty: value.penalty,
        scramble: value.scramble,
        group: value.group ?? null,
      })
      cursor.continue()
    }
  })
  await transactionDone(tx)
  return rows
}

async function countIndexedDbSession(
  db: IDBDatabase,
  sessionId: string
): Promise<number> {
  const tx = db.transaction(STORE_NAME, "readonly")
  const store = tx.objectStore(STORE_NAME)
  const index = store.index(INDEX_SESSION_ORDER)
  const result = await requestToPromise(index.count(keyRangeForSession(sessionId)))
  await transactionDone(tx)
  return result
}

async function listIndexedDbWindow(
  db: IDBDatabase,
  sessionId: string,
  offset: number,
  limit: number
): Promise<TimerSolve[]> {
  const tx = db.transaction(STORE_NAME, "readonly")
  const store = tx.objectStore(STORE_NAME)
  const index = store.index(INDEX_SESSION_ORDER)
  const rows: TimerSolve[] = []
  const request = index.openCursor(keyRangeForSession(sessionId), "prev")
  let skipped = 0

  await new Promise<void>((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor || rows.length >= limit) {
        resolve()
        return
      }

      if (skipped < offset) {
        skipped += 1
        cursor.continue()
        return
      }

      const value = cursor.value as SolveRecord
      rows.push({
        id: value.id,
        time_ms: value.time_ms,
        penalty: value.penalty,
        scramble: value.scramble,
        group: value.group ?? null,
      })
      cursor.continue()
    }
  })
  await transactionDone(tx)
  return rows
}

async function updateIndexedDbPenalty(
  db: IDBDatabase,
  id: string,
  penalty: Penalty
): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  const record = await requestToPromise(store.get(id)) as SolveRecord | undefined
  if (record) {
    store.put({ ...record, penalty, updatedAt: Date.now() } satisfies SolveRecord)
  }
  await transactionDone(tx)
}

async function deleteIndexedDbSolve(db: IDBDatabase, id: string): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  store.delete(id)
  await transactionDone(tx)
}

async function markIndexedDbGroup(
  db: IDBDatabase,
  sessionId: string,
  group: string
): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  const index = store.index(INDEX_SESSION_ORDER)
  const request = index.openCursor(keyRangeForSession(sessionId), "next")

  await new Promise<void>((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve()
        return
      }
      const value = cursor.value as SolveRecord
      if (!value.group) {
        store.put({ ...value, group, updatedAt: Date.now() } satisfies SolveRecord)
      }
      cursor.continue()
    }
  })
  await transactionDone(tx)
}

async function clearIndexedDbSession(
  db: IDBDatabase,
  sessionId: string
): Promise<void> {
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  const index = store.index(INDEX_SESSION_ORDER)
  const request = index.openCursor(keyRangeForSession(sessionId), "next")

  await new Promise<void>((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve()
        return
      }
      store.delete((cursor.value as SolveRecord).id)
      cursor.continue()
    }
  })
  await transactionDone(tx)
}

async function replaceIndexedDbSession(
  db: IDBDatabase,
  sessionId: string,
  solves: TimerSolve[]
): Promise<void> {
  await clearIndexedDbSession(db, sessionId)
  const tx = db.transaction(STORE_NAME, "readwrite")
  const store = tx.objectStore(STORE_NAME)
  solves.forEach((solve, idx) => {
    store.put({
      ...solve,
      sessionId,
      order: idx + 1,
      updatedAt: Date.now(),
    } satisfies SolveRecord)
  })
  await transactionDone(tx)
}

function getMemorySession(sessionId: string): TimerSolve[] {
  return memoryStore.bySession.get(sessionId) ?? []
}

const IDB_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`IndexedDB operation "${label}" timed out after ${IDB_TIMEOUT_MS}ms`))
    }, IDB_TIMEOUT_MS)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) }
    )
  })
}

export function createSolveStore(): SolveStore {
  let dbPromise: Promise<IDBDatabase> | null = null
  let fallbackFired = false
  let _onFallback: ((reason: string) => void) | null = null

  const fireFallback = (reason: string) => {
    if (fallbackFired) return
    fallbackFired = true
    _onFallback?.(reason)
  }

  const withDb = async <T>(run: (db: IDBDatabase) => Promise<T>, fallback: () => Promise<T>): Promise<T> => {
    if (!supportsIndexedDb()) {
      fireFallback("IndexedDB not available")
      return fallback()
    }
    try {
      dbPromise ??= openDb()
      const db = await dbPromise
      return await run(db)
    } catch (err) {
      fireFallback(err instanceof Error ? err.message : "IndexedDB error")
      return fallback()
    }
  }

  return {
    get storageMode() {
      return fallbackFired ? "memory" : "indexeddb"
    },
    get onFallback() {
      return _onFallback
    },
    set onFallback(cb: ((reason: string) => void) | null) {
      _onFallback = cb
    },

    async appendSolve(sessionId: string, solve: TimerSolve) {
      return withDb(
        (db) => appendIndexedDbSolve(db, sessionId, solve),
        async () => {
          const rows = [...getMemorySession(sessionId), solve]
          memoryStore.bySession.set(sessionId, rows)
        }
      )
    },

    async updatePenalty(id: string, penalty: Penalty) {
      return withDb(
        (db) => updateIndexedDbPenalty(db, id, penalty),
        async () => {
          for (const [sessionId, solves] of memoryStore.bySession.entries()) {
            const idx = solves.findIndex((solve) => solve.id === id)
            if (idx !== -1) {
              const next = [...solves]
              next[idx] = { ...next[idx], penalty }
              memoryStore.bySession.set(sessionId, next)
              break
            }
          }
        }
      )
    },

    async deleteSolve(id: string) {
      return withDb(
        (db) => deleteIndexedDbSolve(db, id),
        async () => {
          for (const [sessionId, solves] of memoryStore.bySession.entries()) {
            const next = solves.filter((solve) => solve.id !== id)
            if (next.length !== solves.length) {
              memoryStore.bySession.set(sessionId, next)
              break
            }
          }
        }
      )
    },

    async listWindow(sessionId: string, offset: number, limit: number) {
      const safeOffset = Math.max(0, offset)
      const safeLimit = Math.max(0, limit)
      return withDb(
        (db) => withTimeout(listIndexedDbWindow(db, sessionId, safeOffset, safeLimit), "listWindow"),
        async () => getMemorySession(sessionId).slice().reverse().slice(safeOffset, safeOffset + safeLimit)
      )
    },

    async count(sessionId: string) {
      return withDb(
        (db) => countIndexedDbSession(db, sessionId),
        async () => getMemorySession(sessionId).length
      )
    },

    async loadSession(sessionId: string) {
      return withDb(
        (db) => withTimeout(loadIndexedDbSession(db, sessionId), "loadSession"),
        async () => [...getMemorySession(sessionId)]
      )
    },

    async replaceSession(sessionId: string, solves: TimerSolve[]) {
      const normalized = solves.map((solve) => ({
        ...solve,
        penalty: solve.penalty ?? null,
      }))
      return withDb(
        (db) => withTimeout(replaceIndexedDbSession(db, sessionId, normalized), "replaceSession"),
        async () => {
          memoryStore.bySession.set(sessionId, normalized)
        }
      )
    },

    async markGroup(sessionId: string, group: string) {
      return withDb(
        (db) => withTimeout(markIndexedDbGroup(db, sessionId, group), "markGroup"),
        async () => {
          const solves = getMemorySession(sessionId)
          memoryStore.bySession.set(
            sessionId,
            solves.map((s) => (s.group ? s : { ...s, group }))
          )
        }
      )
    },

    async clearSession(sessionId: string) {
      return withDb(
        (db) => withTimeout(clearIndexedDbSession(db, sessionId), "clearSession"),
        async () => {
          memoryStore.bySession.set(sessionId, [])
        }
      )
    },
  }
}

