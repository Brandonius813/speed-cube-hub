import type { User } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureUserOnboarding } from "@/lib/actions/onboarding"

type BootstrapProfileInput = {
  displayName?: string | null
  handleSeed?: string | null
  avatarUrl?: string | null
}

type ProfileRecord = {
  id: string
  display_name: string | null
  avatar_url: string | null
}

type PostgrestLikeError = {
  code?: string
  message: string
}

function sanitizeDisplayName(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null
}

export function buildDisplayName(
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null
) {
  return [firstName, middleName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim()
}

export function buildHandleBase(seed: string | null | undefined) {
  const normalized = seed?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30)
  return normalized || "cuber"
}

export function createHandleCandidates(seed: string | null | undefined) {
  const baseHandle = buildHandleBase(seed)
  const candidates = [baseHandle]
  const prefix = baseHandle.slice(0, 26)

  for (let i = 1; i <= 999; i += 1) {
    candidates.push(`${prefix}${i}`)
  }

  return candidates
}

function deriveProfileInput(
  user: User,
  profileInput: BootstrapProfileInput = {}
): Required<BootstrapProfileInput> {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
  const displayName =
    sanitizeDisplayName(profileInput.displayName) ||
    sanitizeDisplayName(String(metadata.full_name ?? "")) ||
    sanitizeDisplayName(
      buildDisplayName(
        String(metadata.given_name ?? ""),
        String(metadata.middle_name ?? ""),
        String(metadata.family_name ?? "")
      )
    ) ||
    sanitizeDisplayName(user.email?.split("@")[0]) ||
    "Cuber"

  const handleSeed =
    sanitizeDisplayName(profileInput.handleSeed) ||
    sanitizeDisplayName(String(metadata.preferred_username ?? "")) ||
    displayName

  const avatarUrl =
    profileInput.avatarUrl ??
    (typeof metadata.avatar_url === "string" ? metadata.avatar_url : null) ??
    (typeof metadata.picture === "string" ? metadata.picture : null)

  return {
    displayName,
    handleSeed,
    avatarUrl,
  }
}

async function getExistingProfile(userId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as ProfileRecord | null) ?? null
}

async function patchExistingProfile(
  userId: string,
  current: ProfileRecord,
  desired: Required<BootstrapProfileInput>
) {
  const updates: Partial<ProfileRecord> = {}

  if (!current.display_name && desired.displayName) {
    updates.display_name = desired.displayName
  }

  if (!current.avatar_url && desired.avatarUrl) {
    updates.avatar_url = desired.avatarUrl
  }

  if (Object.keys(updates).length === 0) {
    return
  }

  const admin = createAdminClient()
  const { error } = await admin.from("profiles").update(updates).eq("id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

async function createProfileWithRetry(
  userId: string,
  desired: Required<BootstrapProfileInput>
) {
  const admin = createAdminClient()

  for (const handle of createHandleCandidates(desired.handleSeed)) {
    const { error } = await admin.from("profiles").insert({
      id: userId,
      display_name: desired.displayName,
      handle,
      avatar_url: desired.avatarUrl,
    })

    if (!error) {
      return
    }

    const existingProfile = await getExistingProfile(userId)
    if (existingProfile) {
      return
    }

    if ((error as PostgrestLikeError).code === "23505") {
      continue
    }

    throw new Error(error.message)
  }

  throw new Error("Could not create a unique profile handle.")
}

export async function ensureAuthUserBootstrap(
  user: User,
  profileInput?: BootstrapProfileInput
) {
  const desired = deriveProfileInput(user, profileInput)
  const existingProfile = await getExistingProfile(user.id)

  if (existingProfile) {
    await patchExistingProfile(user.id, existingProfile, desired)
  } else {
    await createProfileWithRetry(user.id, desired)
  }

  await ensureUserOnboarding(user.id)
}
