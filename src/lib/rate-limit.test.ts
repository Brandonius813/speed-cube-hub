import { describe, expect, it, vi } from "vitest"
import { checkRateLimit, type RateLimitStore } from "@/lib/rate-limit"

function createStore(counts: number[]): RateLimitStore {
  let index = 0

  return {
    async increment() {
      const next = counts[index] ?? counts[counts.length - 1] ?? 1
      index += 1
      return next
    },
  }
}

describe("checkRateLimit", () => {
  it("allows requests below the configured limit", async () => {
    const result = await checkRateLimit({
      routeKey: "api_scramble",
      identifier: "127.0.0.1",
      limit: 5,
      windowMs: 60_000,
      now: 1000,
      store: createStore([3]),
    })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    expect(result.mode).toBe("enforced")
  })

  it("blocks requests once the counter exceeds the limit", async () => {
    const result = await checkRateLimit({
      routeKey: "api_og",
      identifier: "127.0.0.1",
      limit: 2,
      windowMs: 60_000,
      now: 1000,
      store: createStore([3]),
    })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("fails open when the backing store throws", async () => {
    const logger = vi.fn()
    const result = await checkRateLimit({
      routeKey: "api_scramble",
      identifier: "127.0.0.1",
      limit: 5,
      windowMs: 60_000,
      now: 1000,
      store: {
        async increment() {
          throw new Error("redis unavailable")
        },
      },
      logger,
    })

    expect(result.allowed).toBe(true)
    expect(result.mode).toBe("fail_open")
    expect(logger).toHaveBeenCalledOnce()
  })
})
