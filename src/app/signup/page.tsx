import { SignupContent } from "./signup-content"
import { getSafeNextPath } from "@/lib/auth/next-path"

type SignupPageProps = {
  searchParams?: Promise<{
    next?: string | string[] | undefined
  }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const nextPath = getSafeNextPath(resolvedSearchParams?.next)

  return <SignupContent nextPath={nextPath} />
}
