"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getPostCommentCounts } from "@/lib/actions/comments"
import { getPostLikeInfo } from "@/lib/actions/likes"
import type { Post, PostTag, PostType } from "@/lib/types"

type LoadPostsOptions = {
  viewerId?: string | null
  userIds?: string[]
  excludeUserIds?: string[]
  query?: string
  limit?: number
  before?: string | null
}

type CreatePostInput = {
  title?: string | null
  content: string
  postType?: PostType
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

export async function loadPosts(options: LoadPostsOptions = {}): Promise<Post[]> {
  const supabase = await createClient()
  const limit = Math.max(1, Math.min(options.limit ?? 12, 50))
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit)

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

export async function createPost(
  fields: CreatePostInput
): Promise<{ success: boolean; post?: Post; error?: string }> {
  const content = fields.content.trim()
  const title = fields.title?.trim() || null
  const postType = fields.postType ?? "text"

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
      title,
      content,
      post_type: postType,
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

  const posts = await loadPosts({ viewerId: user.id, limit: 1, userIds: [user.id] })
  const created = posts.find((post) => post.id === postId)

  revalidatePath("/feed")
  revalidatePath("/discover")

  return { success: true, post: created }
}
