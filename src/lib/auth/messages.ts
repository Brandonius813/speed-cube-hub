type AuthFeedbackTone = "error" | "success" | "info"

export type AuthFeedback = {
  tone: AuthFeedbackTone
  message: string
  showResendConfirmation?: boolean
}

function firstValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

export function getLoginPageFeedback(params: {
  error?: string | string[]
  notice?: string | string[]
}): AuthFeedback | null {
  const notice = firstValue(params.notice)
  if (notice === "confirmation_resent") {
    return {
      tone: "success",
      message: "A fresh confirmation email is on the way.",
    }
  }

  if (notice === "password_reset_sent") {
    return {
      tone: "success",
      message: "If that email is in Speed Cube Hub, a reset link is on the way.",
    }
  }

  const error = firstValue(params.error)
  switch (error) {
    case "no_code":
      return {
        tone: "error",
        message: "That sign-in link is missing required data. Please try again.",
      }
    case "auth_failed":
      return {
        tone: "error",
        message: "Could not complete Google sign-in. Please try again.",
      }
    case "confirmation_failed":
      return {
        tone: "error",
        message:
          "That confirmation link is invalid or expired. Request a new confirmation email below.",
        showResendConfirmation: true,
      }
    case "recovery_failed":
      return {
        tone: "error",
        message:
          "That password reset link is invalid or expired. Request a new reset email to try again.",
      }
    default:
      return null
  }
}
