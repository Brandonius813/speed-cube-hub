import { LoginContent } from "./login-content"
import { getSafeNextPath } from "@/lib/auth/next-path"
import { getLoginPageFeedback } from "@/lib/auth/messages"

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[] | undefined
    error?: string | string[] | undefined
    notice?: string | string[] | undefined
    email?: string | string[] | undefined
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const nextPath = getSafeNextPath(resolvedSearchParams?.next)
  const feedback = getLoginPageFeedback({
    error: resolvedSearchParams?.error,
    notice: resolvedSearchParams?.notice,
  })
  const initialEmail = Array.isArray(resolvedSearchParams?.email)
    ? resolvedSearchParams?.email[0] ?? ""
    : resolvedSearchParams?.email ?? ""

  return (
    <LoginContent
      nextPath={nextPath}
      initialFeedback={feedback}
      initialEmail={initialEmail}
    />
  )
}
