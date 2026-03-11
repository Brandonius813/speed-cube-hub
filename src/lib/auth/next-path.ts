const DEFAULT_AUTH_NEXT_PATH = "/profile"

export function getSafeNextPath(rawNext: string | string[] | null | undefined): string {
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext

  if (!nextPath) {
    return DEFAULT_AUTH_NEXT_PATH
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.startsWith("/\\")) {
    return DEFAULT_AUTH_NEXT_PATH
  }

  if (nextPath === "/login" || nextPath === "/signup") {
    return DEFAULT_AUTH_NEXT_PATH
  }

  return nextPath
}
