"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getChallenges } from "@/lib/actions/challenges"
import { getClubs } from "@/lib/actions/clubs"
import { getViewerSocialState } from "@/lib/actions/follows"
import { getRecentPosts, searchPosts } from "@/lib/actions/posts"
import { isSocialPreviewMode, searchSocialPreview } from "@/lib/social-preview/mock-data"
import type {
  CubeHistoryEntry,
  Profile,
  ProfileCube,
  ProfileLink,
  SearchResults,
} from "@/lib/types"
import { WCA_EVENTS } from "@/lib/constants"

export async function getProfile(): Promise<{
  profile: Profile | null
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { profile: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data as Profile }
}

export async function getProfileByHandle(handle: string): Promise<{
  profile: Profile | null
  error?: string
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data as Profile }
}

export type SearchProfilesOptions = {
  event?: string
  location?: string
  sortBy?: "newest" | "name"
}

export async function searchProfiles(
  query: string,
  options?: SearchProfilesOptions
): Promise<{ profiles: Profile[]; error?: string }> {
  const supabase = await createClient()
  const event = options?.event
  const location = options?.location
  const sortBy = options?.sortBy ?? "newest"

  const trimmed = query.trim()
  if (trimmed.length === 1) {
    return { profiles: [] }
  }

  let qb = supabase.from("profiles").select("*")

  // Filter by main event
  if (event) {
    qb = qb.eq("main_event", event)
  }

  // Filter by location (exact match on the location field)
  if (location) {
    qb = qb.eq("location", location)
  }

  // Text search across name, handle, and location
  // Sanitize input: strip PostgREST filter syntax chars to prevent filter injection via .or()
  if (trimmed.length >= 2) {
    const safe = trimmed.replace(/[,.()"\\:!*%_]/g, "")
    if (safe.length >= 2) {
      const searchTerm = `%${safe}%`
      qb = qb.or(
        `display_name.ilike.${searchTerm},handle.ilike.${searchTerm},location.ilike.${searchTerm}`
      )
    }
  }

  // Sort
  if (sortBy === "name") {
    qb = qb.order("display_name", { ascending: true })
  } else {
    qb = qb.order("created_at", { ascending: false })
  }

  qb = qb.limit(20)

  const { data, error } = await qb

  if (error) return { profiles: [], error: error.message }
  return { profiles: (data as Profile[]) || [] }
}

/**
 * Get all distinct locations that users have set on their profiles.
 * Used for the location filter dropdown on Discover.
 */
export async function getDistinctLocations(): Promise<{
  locations: string[]
  error?: string
}> {
  const supabase = await createClient()

  // Limit to 500 locations and deduplicate in JS
  // (PostgREST doesn't support DISTINCT, so we fetch and dedup)
  const { data, error } = await supabase
    .from("profiles")
    .select("location")
    .not("location", "is", null)
    .order("location")
    .limit(5000)

  if (error) return { locations: [], error: error.message }

  const unique = [...new Set(
    (data || [])
      .map((r) => r.location as string)
      .filter(Boolean)
  )]

  return { locations: unique }
}

async function getRecommendedProfiles(viewerId: string): Promise<Profile[]> {
  const supabase = await createClient()
  const { currentUserId, followingIds, mutedIds } = await getViewerSocialState()
  const viewerProfileResult = await supabase
    .from("profiles")
    .select("main_events")
    .eq("id", viewerId)
    .single()

  const viewerEvents = new Set(
    ((viewerProfileResult.data?.main_events as string[] | null) ?? []).filter(Boolean)
  )
  const excludedIds = new Set([currentUserId, ...followingIds, ...mutedIds].filter(Boolean) as string[])

  const { data: candidates, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(40)

  if (error || !candidates) return []

  const availableProfiles = (candidates as Profile[]).filter(
    (profile) => !excludedIds.has(profile.id)
  )
  if (availableProfiles.length === 0) return []

  const candidateIds = availableProfiles.map((profile) => profile.id)
  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceIso = since.toISOString()
  const sinceDate = sinceIso.slice(0, 10)

  const [postsResult, sessionsResult, mutualsResult] = await Promise.all([
    supabase
      .from("posts")
      .select("user_id")
      .eq("visibility", "public")
      .in("user_id", candidateIds)
      .gte("created_at", sinceIso),
    supabase
      .from("sessions")
      .select("user_id")
      .in("user_id", candidateIds)
      .gte("session_date", sinceDate),
    followingIds.length > 0
      ? supabase
          .from("follows")
          .select("follower_id, following_id")
          .in("follower_id", candidateIds)
          .in("following_id", followingIds)
      : Promise.resolve({ data: [] as { follower_id: string; following_id: string }[] }),
  ])

  const postCounts = new Map<string, number>()
  for (const row of postsResult.data ?? []) {
    postCounts.set(row.user_id as string, (postCounts.get(row.user_id as string) ?? 0) + 1)
  }

  const sessionCounts = new Map<string, number>()
  for (const row of sessionsResult.data ?? []) {
    sessionCounts.set(row.user_id as string, (sessionCounts.get(row.user_id as string) ?? 0) + 1)
  }

  const mutualCounts = new Map<string, number>()
  for (const row of mutualsResult.data ?? []) {
    mutualCounts.set(
      row.follower_id as string,
      (mutualCounts.get(row.follower_id as string) ?? 0) + 1
    )
  }

  return availableProfiles
    .map((profile) => {
      const sharedEvents = (profile.main_events ?? []).filter((eventId) =>
        viewerEvents.has(eventId)
      ).length
      const completenessScore = [
        profile.bio,
        profile.avatar_url,
        profile.location,
      ].filter(Boolean).length
      const score =
        sharedEvents * 12 +
        (mutualCounts.get(profile.id) ?? 0) * 10 +
        (postCounts.get(profile.id) ?? 0) * 5 +
        (sessionCounts.get(profile.id) ?? 0) * 3 +
        completenessScore

      return { profile, score }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return Date.parse(b.profile.created_at) - Date.parse(a.profile.created_at)
    })
    .map((item) => item.profile)
}

export async function searchAll(
  query: string
): Promise<{ results: SearchResults; error?: string }> {
  if (isSocialPreviewMode()) {
    return { results: searchSocialPreview(query) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const trimmed = query.trim()
  const recommendedProfiles =
    !trimmed && user?.id ? await getRecommendedProfiles(user.id) : null
  const [profilesResult, postsResult, clubsResult, challengesResult] =
    await Promise.all([
      recommendedProfiles
        ? Promise.resolve({ profiles: recommendedProfiles })
        : searchProfiles(trimmed),
      trimmed.length >= 2
        ? searchPosts(trimmed, user?.id ?? null)
        : Promise.resolve({ posts: await getRecentPosts(6, user?.id ?? null) }),
      getClubs(trimmed || undefined),
      getChallenges(),
    ])

  const safe = trimmed.toLowerCase()
  const challenges = (challengesResult.data ?? [])
    .filter((challenge) => {
      if (!safe) return true
      return [challenge.title, challenge.description ?? ""].join(" ").toLowerCase().includes(safe)
    })
    .slice(0, 8)

  return {
    results: {
      profiles: profilesResult.profiles,
      posts: postsResult.posts.slice(0, 8),
      clubs: clubsResult.clubs.slice(0, 8),
      challenges,
    },
  }
}

/**
 * Generate a unique handle from a name.
 * Tries the clean name first (e.g. "brandontrue"), then adds incrementing
 * numbers (brandontrue1, brandontrue2, ...) until one is available.
 * Uses a single query to fetch all similar handles instead of looping.
 */
export async function generateUniqueHandle(
  name: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const baseHandle = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30)

  // Fetch all existing handles that start with the base handle in one query
  const { data: existing } = await supabase
    .from("profiles")
    .select("handle")
    .ilike("handle", `${baseHandle}%`)

  const taken = new Set((existing ?? []).map((r) => r.handle as string))

  // Try the clean name first
  if (!taken.has(baseHandle)) return baseHandle

  // Find the first available numbered variant
  const prefix = baseHandle.slice(0, 26)
  for (let i = 1; i <= 999; i++) {
    const candidate = `${prefix}${i}`
    if (!taken.has(candidate)) return candidate
  }

  // Fallback (extremely unlikely)
  return `${baseHandle.slice(0, 20)}${Date.now()}`
}

export async function checkHandleAvailable(
  handle: string
): Promise<{ available: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { available: false, error: "Not authenticated" }
  }

  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .single()

  return { available: !data }
}

export async function updateProfile(fields: {
  display_name?: string
  handle?: string
  bio?: string | null
  avatar_url?: string | null
  location?: string | null
  country_id?: string | null
  sponsor?: string | null
  main_event?: string | null
  main_events?: string[]
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate display_name if provided
  if (fields.display_name !== undefined) {
    const name = fields.display_name.trim()
    if (!name || name.length < 1) {
      return { success: false, error: "Display name is required." }
    }
    if (name.length > 100) {
      return { success: false, error: "Display name must be under 100 characters." }
    }
    fields.display_name = name
  }

  // Validate handle if provided
  if (fields.handle !== undefined) {
    const handle = fields.handle.trim().toLowerCase()
    if (!handle || handle.length < 3) {
      return { success: false, error: "Username must be at least 3 characters." }
    }
    if (handle.length > 30) {
      return { success: false, error: "Username must be under 30 characters." }
    }
    if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/.test(handle)) {
      return { success: false, error: "Username can only contain lowercase letters, numbers, hyphens, and underscores. Must start and end with a letter or number." }
    }
    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", handle)
      .neq("id", user.id)
      .single()

    if (existing) {
      return { success: false, error: "That username is already taken." }
    }
    fields.handle = handle
  }

  // Validate bio if provided
  if (fields.bio !== undefined && fields.bio !== null) {
    if (fields.bio.length > 500) {
      return { success: false, error: "Bio must be under 500 characters." }
    }
  }

  // Validate location if provided
  if (fields.location !== undefined && fields.location !== null) {
    if (fields.location.length > 100) {
      return { success: false, error: "Location must be under 100 characters." }
    }
  }

  // Validate country_id if provided (WCA country codes are short strings like "US", "CN")
  if (fields.country_id !== undefined && fields.country_id !== null) {
    if (fields.country_id.length > 50) {
      return { success: false, error: "Invalid country." }
    }
  }

  // Validate sponsor if provided
  if (fields.sponsor !== undefined && fields.sponsor !== null) {
    if (fields.sponsor.length > 100) {
      return { success: false, error: "Sponsor must be under 100 characters." }
    }
  }

  // Validate main_event if provided
  if (fields.main_event !== undefined && fields.main_event !== null) {
    const validIds = WCA_EVENTS.map((e) => e.id) as string[]
    if (!validIds.includes(fields.main_event)) {
      return { success: false, error: "Invalid main event." }
    }
  }

  // Validate main_events if provided (up to 3)
  if (fields.main_events !== undefined) {
    const validIds = WCA_EVENTS.map((e) => e.id) as string[]
    if (fields.main_events.length > 3) {
      return { success: false, error: "Maximum 3 main events allowed." }
    }
    for (const eventId of fields.main_events) {
      if (!validIds.includes(eventId)) {
        return { success: false, error: `Invalid event: ${eventId}` }
      }
    }
  }

  // Validate avatar_url if provided
  if (fields.avatar_url !== undefined && fields.avatar_url !== null) {
    const url = fields.avatar_url.trim()
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      return { success: false, error: "Avatar URL must start with http:// or https://" }
    }
    fields.avatar_url = url || null
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  if (fields.handle) {
    revalidatePath(`/profile/${fields.handle}`)
  }
  return { success: true }
}

const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2MB
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

// Magic byte signatures for server-side image validation
const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]

function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  const bytes = Array.from(buffer.subarray(0, 12))
  // JPEG
  if (bytes[0] === JPEG_MAGIC[0] && bytes[1] === JPEG_MAGIC[1] && bytes[2] === JPEG_MAGIC[2]) return true
  // PNG
  if (bytes[0] === PNG_MAGIC[0] && bytes[1] === PNG_MAGIC[1] && bytes[2] === PNG_MAGIC[2] && bytes[3] === PNG_MAGIC[3]) return true
  // WebP (RIFF....WEBP)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return true
  return false
}

export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const file = formData.get("avatar") as File | null
  if (!file || file.size === 0) {
    return { success: false, error: "No file provided." }
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPG, PNG, and WebP images are allowed." }
  }

  if (file.size > AVATAR_MAX_SIZE) {
    return { success: false, error: "Image must be under 2MB." }
  }

  // Convert File to Buffer for reliable server-side upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Validate actual file content (magic bytes), not just the MIME type
  if (!isValidImageBuffer(buffer)) {
    return { success: false, error: "The file doesn't appear to be a valid image." }
  }

  // Fixed path (no extension) — avoids orphan files when user changes format
  const filePath = `${user.id}/avatar`

  // Use admin client to bypass storage RLS
  const admin = createAdminClient()

  // Clean up any old avatar files (handles extension mismatch from legacy uploads)
  const { data: existingFiles } = await admin.storage
    .from("avatars")
    .list(user.id)

  if (existingFiles?.length) {
    const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`)
    await admin.storage.from("avatars").remove(filesToDelete)
  }

  const { error: uploadError } = await admin.storage
    .from("avatars")
    .upload(filePath, buffer, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error("Avatar upload error:", uploadError)
    if (uploadError.message?.includes("Bucket not found")) {
      return { success: false, error: "Storage is not configured. Please contact support." }
    }
    if (uploadError.message?.includes("too large") || uploadError.message?.includes("Payload")) {
      return { success: false, error: "Image is too large. Maximum size is 2MB." }
    }
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const { data: urlData } = admin.storage
    .from("avatars")
    .getPublicUrl(filePath)

  // Add cache-busting param so the browser loads the new image
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  // Return the URL — the caller (updateProfile) handles saving it to the DB.
  return { success: true, url: publicUrl }
}

export async function deleteAvatar(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const admin = createAdminClient()

  // List and delete all files in the user's avatar folder
  const { data: files } = await admin.storage.from("avatars").list(user.id)
  if (files?.length) {
    await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`))
  }

  return { success: true }
}

const VALID_PLATFORMS = [
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "discord",
  "wca",
  "website",
] as const

export async function updateProfileLinks(
  links: ProfileLink[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (links.length > 10) {
    return { success: false, error: "Maximum 10 links allowed." }
  }

  // Validate each link
  for (const link of links) {
    if (!link.url.trim()) {
      return { success: false, error: "URL is required for each link." }
    }
    const url = link.url.trim()
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { success: false, error: `Invalid URL: ${url}` }
    }
    if (!link.label.trim()) {
      return { success: false, error: "Label is required for each link." }
    }
    if (!VALID_PLATFORMS.includes(link.platform as (typeof VALID_PLATFORMS)[number])) {
      return { success: false, error: `Invalid platform: ${link.platform}` }
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      links: links.map((l) => ({
        platform: l.platform,
        url: l.url.trim(),
        label: l.label.trim(),
      })),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function updateProfileCubes(
  cubes: ProfileCube[],
  cubeHistory?: CubeHistoryEntry[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  if (cubes.length > 20) {
    return { success: false, error: "Maximum 20 cubes allowed." }
  }

  for (const c of cubes) {
    if (!c.name.trim()) {
      return { success: false, error: "Cube name is required." }
    }
    if (!c.event.trim()) {
      return { success: false, error: "Event is required for each cube." }
    }
  }

  // Enforce one main per event
  const events = cubes.map((c) => c.event.trim())
  const uniqueEvents = new Set(events)
  if (events.length !== uniqueEvents.size) {
    return { success: false, error: "Only one main cube per event is allowed." }
  }

  const updateData: Record<string, unknown> = {
    cubes: cubes.map((c) => ({
      name: c.name.trim(),
      setup: c.setup.trim(),
      event: c.event.trim(),
    })),
    updated_at: new Date().toISOString(),
  }

  if (cubeHistory !== undefined) {
    // Cap history at 100 entries to prevent unbounded growth
    updateData.cube_history = cubeHistory.slice(0, 100).map((h) => ({
      name: h.name.trim(),
      setup: h.setup.trim(),
      event: h.event.trim(),
      retired_at: h.retired_at,
    }))
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/profile")
  return { success: true }
}

export async function updatePBVisibleTypes(
  types: string[] | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      pb_visible_types: types,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/pbs")
  return { success: true }
}

export async function updatePBMainEvents(
  events: string[] | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Extract the first 3 as the profile-wide main_events
  const mainEventsOnly = (events ?? []).slice(0, 3)

  const { error } = await supabase
    .from("profiles")
    .update({
      pbs_main_events: events,
      main_events: mainEventsOnly,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/pbs")
  revalidatePath("/profile")
  return { success: true }
}

export async function updatePBDisplayTypes(
  displayTypes: Record<string, string[]> | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      pb_display_types: displayTypes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
