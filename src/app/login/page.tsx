import { LoginContent } from "./login-content"

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[] | undefined
  }>
}

function getSafeNextPath(rawNext: string | string[] | null | undefined) {
  const nextPath = Array.isArray(rawNext) ? rawNext[0] : rawNext

  if (!nextPath) {
    return "/feed"
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.startsWith("/\\")) {
    return "/feed"
  }

  if (nextPath === "/login" || nextPath === "/signup") {
    return "/feed"
  }

  return nextPath
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const nextPath = getSafeNextPath(resolvedSearchParams?.next)

  return <LoginContent nextPath={nextPath} />
}
