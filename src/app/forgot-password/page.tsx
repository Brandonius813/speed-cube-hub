import { ForgotPasswordContent } from "./forgot-password-content"

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    email?: string | string[] | undefined
  }>
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const initialEmail = Array.isArray(resolvedSearchParams?.email)
    ? resolvedSearchParams?.email[0] ?? ""
    : resolvedSearchParams?.email ?? ""

  return <ForgotPasswordContent initialEmail={initialEmail} />
}
