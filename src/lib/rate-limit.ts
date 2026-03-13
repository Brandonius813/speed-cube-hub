import { NextResponse, type NextRequest } from "next/server"

export type RateLimitStore = {
  increment(key: string, windowSeconds: number): Promise<number>
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
  mode: "enforced" | "disabled" | "fail_open"
}

type RateLimitOptions = {
  routeKey: string
  identifier: string
  limit: number
  windowMs: number
  now?: number
  store?: RateLimitStore | null
  logger?: (message: string, error?: unknown) => void
}

type UpstashPipelineResponse = Array<{
  result?: number | string | null
  error?: string
}>

function resolveUpstashStore(fetchImpl: typeof fetch = fetch): RateLimitStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  if (!url || !token) return null

  return {
    async increment(key: string, windowSeconds: number) {
      const response = await fetchImpl(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSeconds],
        ]),
      })

      if (!response.ok) {
        throw new Error(`Upstash rate-limit request failed with ${response.status}`)
      }

      const data = (await response.json()) as UpstashPipelineResponse
      const incrementResult = data[0]

      if (!incrementResult || incrementResult.error) {
        throw new Error(incrementResult?.error ?? "Upstash rate-limit increment failed")
      }

      const count = Number(incrementResult.result)
      if (!Number.isFinite(count)) {
        throw new Error("Upstash rate-limit returned a non-numeric counter")
      }

      return count
    },
  }
}

export async function checkRateLimit({
  routeKey,
  identifier,
  limit,
  windowMs,
  now = Date.now(),
  store = resolveUpstashStore(),
  logger = (message, error) => console.error(message, error),
}: RateLimitOptions): Promise<RateLimitResult> {
  const windowIndex = Math.floor(now / windowMs)
  const resetAt = (windowIndex + 1) * windowMs
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000))
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))

  if (!store) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
      retryAfterSeconds,
      mode: "disabled",
    }
  }

  try {
    const key = `rate_limit:${routeKey}:${windowIndex}:${identifier}`
    const count = await store.increment(key, windowSeconds)

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfterSeconds,
      mode: "enforced",
    }
  } catch (error) {
    logger(`Rate limiting failed open for ${routeKey}`, error)

    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
      retryAfterSeconds,
      mode: "fail_open",
    }
  }
}

function getRateLimitIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstAddress = forwardedFor.split(",")[0]?.trim()
    if (firstAddress) return firstAddress
  }

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const cfConnectingIp = request.headers.get("cf-connecting-ip")
  if (cfConnectingIp) return cfConnectingIp

  return "anonymous"
}

export async function enforceRequestRateLimit(
  request: NextRequest,
  options: Omit<RateLimitOptions, "identifier">
) {
  const result = await checkRateLimit({
    ...options,
    identifier: getRateLimitIdentifier(request),
  })

  if (result.allowed) {
    return null
  }

  return NextResponse.json(
    {
      error: "Too many requests. Please slow down and try again shortly.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
      },
    }
  )
}
