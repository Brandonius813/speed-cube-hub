"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getPostCommentCounts } from "@/lib/actions/comments"
import { getPostLikeInfo } from "@/lib/actions/likes"
import type { Post, PostTag, PostType } from "@/lib/types"

type LoadPostsOptions = {
  viewerId?: string | null
  userIds?: string[]
  excludeUserIds?: string[]
  query?: string
  clubId?: string | null
  visibility?: "public" | "club"
  limit?: number
  before?: string | null
}

type CreatePostInput = {
  title?: string | null
  content: string
  postType?: PostType
  clubId?: string | null
  imageUrls?: { url: string; altText?: string | null }[]
  tags?: {
    tagType: PostTag["tag_type"]
    label: string
    referenceId?: string | null
    metadata?: Record<string, unknown>
  }[]
}

const POST_SELECT = `
  *,
  profile:profiles(
    display_name,
    handle,
    avatar_url
  ),
  media:post_media(*),
  tags:post_tags(*)
`

function sanitizeSearchTerm(query: string) {
  return query.trim().replace(/[,.()"\\:!*%_]/g, "")
}

function mapPostRow(row: Record<string, unknown>): Post {
  const media = Array.isArray(row.media) ? row.media : []
  const tags = Array.isArray(row.tags) ? row.tags : []

  return {
    ...(row as unknown as Omit<Post, "media" | "tags" | "like_count" | "has_liked" | "comment_count">),
    media: [...media].sort(
      (a, b) =>
        Number((a as { sort_order?: number }).sort_order ?? 0) -
        Number((b as { sort_order?: number }).sort_order ?? 0)
    ) as Post["media"],
    tags: tags as Post["tags"],
    like_count: 0,
    has_liked: false,
    comment_count: 0,
  }
}

const POST_IMAGE_MAX_SIZE = 5 * 1024 * 1024
const POST_IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]

function isValidImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  const bytes = Array.from(buffer.subarray(0, 12))
  if (bytes[0] === JPEG_MAGIC[0] && bytes[1] === JPEG_MAGIC[1] && bytes[2] === JPEG_MAGIC[2]) return true
  if (bytes[0] === PNG_MAGIC[0] && bytes[1] === PNG_MAGIC[1] && bytes[2] === PNG_MAGIC[2] && bytes[3] === PNG_MAGIC[3]) return true
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true
  }
  return false
}

function fileExtensionForMime(type: string) {
  switch (type) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    default:
      return "bin"
  }
}

export async function loadPosts(options: LoadPostsOptions = {}): Promise<Post[]> {
  const supabase = await createClient()
  const limit = Math.max(1, Math.min(options.limit ?? 12, 50))
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("visibility", options.visibility ?? "public")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (options.clubId) {
    query = query.eq("club_id", options.clubId)
  }

  if (options.userIds && options.userIds.length > 0) {
    query = query.in("user_id", options.userIds)
  }

  if (options.excludeUserIds && options.excludeUserIds.length > 0) {
    query = query.not("user_id", "in", `(${options.excludeUserIds.join(",")})`)
  }

  if (options.before) {
    query = query.lt("created_at", options.before)
  }

  const safeQuery = options.query ? sanitizeSearchTerm(options.query) : ""
  if (safeQuery.length >= 2) {
    const searchTerm = `%${safeQuery}%`
    query = query.or(`content.ilike.${searchTerm},title.ilike.${searchTerm}`)
  }

  const { data, error } = await query

  if (error || !data) {
    if (error) {
      console.error("loadPosts error", error)
    }
    return []
  }

  const posts = data.map((row) => mapPostRow(row as Record<string, unknown>))
  const likeInfo = await getPostLikeInfo(
    posts.map((post) => post.id),
    options.viewerId ?? null
  )
  const commentCounts = await getPostCommentCounts(posts.map((post) => post.id))

  return posts.map((post) => ({
    ...post,
    like_count: likeInfo.get(post.id)?.count ?? 0,
    has_liked: likeInfo.get(post.id)?.hasLiked ?? false,
    comment_count: commentCounts[post.id] ?? 0,
  }))
}

export async function getRecentPosts(
  limit = 8,
  viewerId?: string | null
): Promise<Post[]> {
  return loadPosts({ limit, viewerId })
}

export async function searchPosts(
  query: string,
  viewerId?: string | null
): Promise<{ posts: Post[]; error?: string }> {
  const posts = await loadPosts({ query, limit: 12, viewerId })
  return { posts }
}

export async function uploadPostImage(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const file = formData.get("image") as File | null
  if (!file || file.size === 0) {
    return { success: false, error: "No file provided." }
  }

  if (!POST_IMAGE_ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only JPG, PNG, and WebP images are allowed." }
  }

  if (file.size > POST_IMAGE_MAX_SIZE) {
    return { success: false, error: "Image must be under 5MB." }
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (!isValidImageBuffer(buffer)) {
    return { success: false, error: "The file doesn't appear to be a valid image." }
  }

  const admin = createAdminClient()
  const extension = fileExtensionForMime(file.type)
  const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await admin.storage
    .from("post-images")
    .upload(filePath, buffer, { contentType: file.type })

  if (uploadError) {
    console.error("Post image upload error:", uploadError)
    if (uploadError.message?.includes("Bucket not found")) {
      return { success: false, error: "Post image storage is not configured yet." }
    }
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const { data: urlData } = admin.storage
    .from("post-images")
    .getPublicUrl(filePath)

  return { success: true, url: urlData.publicUrl }
}

export async function createPost(
  fields: CreatePostInput
): Promise<{ success: boolean; post?: Post; error?: string }> {
  const content = fields.content.trim()
  const title = fields.title?.trim() || null
  const postType = fields.postType ?? "text"
  const visibility = fields.clubId ? "club" : "public"

  if (!content && !title && (!fields.imageUrls || fields.imageUrls.length === 0)) {
    return { success: false, error: "Post cannot be empty." }
  }
  if (content.length > 2000) {
    return { success: false, error: "Post content must be 2000 characters or less." }
  }
  if (title && title.length > 140) {
    return { success: false, error: "Post title must be 140 characters or less." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: postRow, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      club_id: fields.clubId ?? null,
      title,
      content,
      post_type: postType,
      visibility,
    })
    .select("id")
    .single()

  if (postError || !postRow) {
    return { success: false, error: postError?.message ?? "Failed to create post." }
  }

  const postId = postRow.id as string

  if (fields.imageUrls?.length) {
    const mediaRows = fields.imageUrls
      .filter((media) => media.url.trim().length > 0)
      .slice(0, 4)
      .map((media, index) => ({
        post_id: postId,
        url: media.url.trim(),
        alt_text: media.altText?.trim() || null,
        sort_order: index,
      }))

    if (mediaRows.length > 0) {
      const { error } = await supabase.from("post_media").insert(mediaRows)
      if (error) {
        return { success: false, error: error.message }
      }
    }
  }

  if (fields.tags?.length) {
    const tagRows = fields.tags
      .filter((tag) => tag.label.trim().length > 0)
      .slice(0, 5)
      .map((tag) => ({
        post_id: postId,
        tag_type: tag.tagType,
        reference_id: tag.referenceId?.trim() || null,
        label: tag.label.trim(),
        metadata: tag.metadata ?? {},
      }))

    if (tagRows.length > 0) {
      const { error } = await supabase.from("post_tags").insert(tagRows)
      if (error) {
        return { success: false, error: error.message }
      }
    }
  }

  const posts = await loadPosts({
    viewerId: user.id,
    limit: 1,
    userIds: [user.id],
    visibility,
    clubId: fields.clubId ?? null,
  })
  const created = posts.find((post) => post.id === postId)

  revalidatePath("/feed")
  revalidatePath("/discover")
  revalidatePath("/clubs")
  if (fields.clubId) {
    revalidatePath(`/clubs/${fields.clubId}`)
  }

  return { success: true, post: created }
}
