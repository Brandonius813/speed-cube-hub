import { LoginContent } from "./login-content"
import { getSafeNextPath } from "@/lib/auth/next-path"

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[] | undefined
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const nextPath = getSafeNextPath(resolvedSearchParams?.next)

  return <LoginContent nextPath={nextPath} />
}
