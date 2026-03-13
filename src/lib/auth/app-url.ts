import { getSafeNextPath } from "@/lib/auth/next-path"

const LOCAL_SITE_URL = "http://127.0.0.1:3000"

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

export function getSiteUrl() {
  const explicitUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim()

  if (explicitUrl) {
    return normalizeBaseUrl(explicitUrl)
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${normalizeBaseUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL)}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${normalizeBaseUrl(process.env.VERCEL_URL)}`
  }

  return LOCAL_SITE_URL
}

export function buildOAuthCallbackUrl(nextPath?: string) {
  const url = new URL("/api/auth/callback", getSiteUrl())

  if (nextPath) {
    url.searchParams.set("next", getSafeNextPath(nextPath))
  }

  return url.toString()
}

export function buildAuthConfirmUrl(nextPath?: string) {
  const url = new URL("/auth/confirm", getSiteUrl())

  if (nextPath) {
    url.searchParams.set("next", getSafeNextPath(nextPath))
  }

  return url.toString()
}
