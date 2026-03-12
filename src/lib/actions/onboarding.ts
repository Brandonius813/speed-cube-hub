"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  hasCompletedOnboarding,
  ONBOARDING_STEP_IDS,
  type OnboardingStepId,
} from "@/lib/onboarding"
import type { UserOnboarding } from "@/lib/types"

const USER_ONBOARDING_SELECT = [
  "user_id",
  "auto_launch_pending",
  "profile_viewed_at",
  "main_cube_added_at",
  "bulk_imported_at",
  "first_timer_solve_at",
  "comp_sim_tried_at",
  "feed_visited_at",
  "clubs_searched_at",
  "dismissed_at",
  "finished_at",
  "created_at",
  "updated_at",
].join(", ")

const STEP_TO_COLUMN: Record<OnboardingStepId, keyof UserOnboarding> = {
  profile_viewed: "profile_viewed_at",
  main_cube_added: "main_cube_added_at",
  bulk_imported: "bulk_imported_at",
  first_timer_solve: "first_timer_solve_at",
  comp_sim_tried: "comp_sim_tried_at",
  feed_visited: "feed_visited_at",
  clubs_searched: "clubs_searched_at",
}

function toUserOnboarding(data: unknown): UserOnboarding {
  return data as UserOnboarding
}

async function getAuthedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

async function finishOnboardingIfComplete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  onboarding: UserOnboarding
): Promise<UserOnboarding> {
  if (onboarding.finished_at || !hasCompletedOnboarding(onboarding)) {
    return onboarding
  }

  const finishedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from("user_onboarding")
    .update({ finished_at: finishedAt })
    .eq("user_id", onboarding.user_id)
    .select(USER_ONBOARDING_SELECT)
    .single()

  if (error) {
    return {
      ...onboarding,
      finished_at: finishedAt,
    }
  }

  return toUserOnboarding(data)
}

export async function getUserOnboarding(): Promise<UserOnboarding | null> {
  const userId = await getAuthedUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from("user_onboarding")
    .select(USER_ONBOARDING_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  return data ? toUserOnboarding(data) : null
}

export async function ensureUserOnboarding(userId?: string): Promise<UserOnboarding | null> {
  const resolvedUserId = userId ?? (await getAuthedUserId())
  if (!resolvedUserId) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("user_onboarding")
    .upsert({ user_id: resolvedUserId }, { onConflict: "user_id" })
    .select(USER_ONBOARDING_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return toUserOnboarding(data)
}

export async function markOnboardingStepComplete(
  step: OnboardingStepId
): Promise<{ success: boolean; onboarding: UserOnboarding | null; error?: string }> {
  if (!ONBOARDING_STEP_IDS.includes(step)) {
    return { success: false, onboarding: null, error: "Invalid onboarding step." }
  }

  const userId = await getAuthedUserId()
  if (!userId) {
    return { success: false, onboarding: null, error: "Not authenticated." }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("user_onboarding")
    .select(USER_ONBOARDING_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (!existing) {
    return { success: true, onboarding: null }
  }

  const column = STEP_TO_COLUMN[step]
  const current = toUserOnboarding(existing)
  if (current[column]) {
    const finished = await finishOnboardingIfComplete(supabase, current)
    return { success: true, onboarding: finished }
  }

  const now = new Date().toISOString()
  const updateData: Partial<UserOnboarding> & { auto_launch_pending?: boolean } = {
    [column]: now,
  }

  if (step === "profile_viewed") {
    updateData.auto_launch_pending = false
  }

  const { data, error } = await supabase
    .from("user_onboarding")
    .update(updateData)
    .eq("user_id", userId)
    .select(USER_ONBOARDING_SELECT)
    .single()

  if (error) {
    return { success: false, onboarding: null, error: error.message }
  }

  const finished = await finishOnboardingIfComplete(supabase, toUserOnboarding(data))
  revalidatePath("/profile")

  return { success: true, onboarding: finished }
}

export async function dismissOnboardingAutoLaunch(): Promise<{
  success: boolean
  onboarding: UserOnboarding | null
  error?: string
}> {
  const userId = await getAuthedUserId()
  if (!userId) {
    return { success: false, onboarding: null, error: "Not authenticated." }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("user_onboarding")
    .select(USER_ONBOARDING_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (!existing) {
    return { success: true, onboarding: null }
  }

  const { data, error } = await supabase
    .from("user_onboarding")
    .update({
      auto_launch_pending: false,
      dismissed_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select(USER_ONBOARDING_SELECT)
    .single()

  if (error) {
    return { success: false, onboarding: null, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true, onboarding: toUserOnboarding(data) }
}

export async function replayOnboarding(): Promise<{
  success: boolean
  onboarding: UserOnboarding | null
  error?: string
}> {
  const userId = await getAuthedUserId()
  if (!userId) {
    return { success: false, onboarding: null, error: "Not authenticated." }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("user_onboarding")
    .select(USER_ONBOARDING_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (!existing) {
    return { success: true, onboarding: null }
  }

  const { data, error } = await supabase
    .from("user_onboarding")
    .update({
      auto_launch_pending: false,
      dismissed_at: null,
    })
    .eq("user_id", userId)
    .select(USER_ONBOARDING_SELECT)
    .single()

  if (error) {
    return { success: false, onboarding: null, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true, onboarding: toUserOnboarding(data) }
}
