import type {
  Challenge,
  Club,
  ClubLeaderboardEntry,
  ClubMember,
  Comment,
  CommentThread,
  FeedEntry,
  Post,
  PostTag,
  PostType,
  Profile,
  SearchResults,
  SessionFeedEntry,
} from "@/lib/types"

type PreviewCommentTarget = "session" | "post"

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function daysAgo(days: number, hour = 18, minute = 15) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  date.setUTCHours(hour, minute, 0, 0)
  return date.toISOString()
}

function createProfile(overrides: Partial<Profile> & Pick<Profile, "id" | "display_name" | "handle">): Profile {
  const createdAt = daysAgo(45, 12)

  return {
    id: overrides.id,
    display_name: overrides.display_name,
    handle: overrides.handle,
    bio: overrides.bio ?? null,
    avatar_url:
      overrides.avatar_url ??
      `https://api.dicebear.com/9.x/thumbs/svg?seed=${overrides.handle}`,
    wca_id: overrides.wca_id ?? null,
    location: overrides.location ?? null,
    sponsor: overrides.sponsor ?? null,
    events: overrides.events ?? ["333"],
    cubes: overrides.cubes ?? [],
    cube_history: overrides.cube_history ?? [],
    links: overrides.links ?? [],
    accomplishments: overrides.accomplishments ?? [],
    country_id: overrides.country_id ?? null,
    main_event: overrides.main_event ?? "333",
    main_events: overrides.main_events ?? overrides.events ?? ["333"],
    wca_event_order: overrides.wca_event_order ?? null,
    pb_visible_types: overrides.pb_visible_types ?? null,
    pbs_main_events: overrides.pbs_main_events ?? null,
    pb_display_types: overrides.pb_display_types ?? null,
    created_at: overrides.created_at ?? createdAt,
    updated_at: overrides.updated_at ?? createdAt,
  }
}

function createPostTag(
  postId: string,
  tagType: PostTag["tag_type"],
  label: string,
  createdAt: string,
  referenceId?: string | null,
  metadata?: Record<string, unknown>
): PostTag {
  return {
    id: `${postId}-${tagType}-${label.toLowerCase().replace(/\s+/g, "-")}`,
    post_id: postId,
    tag_type: tagType,
    reference_id: referenceId ?? null,
    label,
    metadata: metadata ?? {},
    created_at: createdAt,
  }
}

export function isSocialPreviewMode() {
  return process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_MODE === "1"
}

const previewProfiles = [
  createProfile({
    id: "preview-brandon",
    display_name: "Brandon Preview",
    handle: "preview-brandon",
    bio: "Founder energy, shipping the social layer around the timer.",
    location: "New York, USA",
    events: ["333", "222", "333oh"],
    main_events: ["333", "222", "333oh"],
  }),
  createProfile({
    id: "preview-lena",
    display_name: "Lena Cross",
    handle: "preview-lena",
    bio: "Cross trainer nerd. Posts drills, PBs, and session reflections.",
    location: "Berlin, Germany",
    events: ["333", "444", "333oh"],
    main_events: ["333", "444", "333oh"],
  }),
  createProfile({
    id: "preview-mateo",
    display_name: "Mateo Blocks",
    handle: "preview-mateo",
    bio: "Competition-focused solver posting breakdowns after hard sessions.",
    location: "Austin, USA",
    events: ["333", "555", "minx"],
    main_events: ["333", "555", "minx"],
  }),
  createProfile({
    id: "preview-riley",
    display_name: "Riley Recon",
    handle: "preview-riley",
    bio: "Competition recaps, photo dumps, and puzzle mail days.",
    location: "Los Angeles, USA",
    events: ["333", "pyram", "skewb"],
    main_events: ["333", "pyram", "skewb"],
  }),
  createProfile({
    id: "preview-jules",
    display_name: "Jules Layer",
    handle: "preview-jules",
    bio: "Beginner-friendly progress posts and challenge check-ins.",
    location: "London, UK",
    events: ["333", "222", "pyram"],
    main_events: ["333", "222", "pyram"],
  }),
  createProfile({
    id: "preview-ari",
    display_name: "Ari Timer",
    handle: "preview-ari",
    bio: "Tracking every mean, every session, every plateau.",
    location: "Toronto, Canada",
    events: ["333", "222", "skewb"],
    main_events: ["333", "222", "skewb"],
  }),
  createProfile({
    id: "preview-sora",
    display_name: "Sora Roux",
    handle: "preview-sora",
    bio: "Roux advocate posting slow-solve notes and new puzzle thoughts.",
    location: "Tokyo, Japan",
    events: ["333", "clock", "sq1"],
    main_events: ["333", "clock", "sq1"],
  }),
  createProfile({
    id: "preview-noah",
    display_name: "Noah Slice",
    handle: "preview-noah",
    bio: "Square-1, big cubes, and a lot of gear opinions.",
    location: "Chicago, USA",
    events: ["sq1", "444", "555"],
    main_events: ["sq1", "444", "555"],
  }),
]

const profileById = Object.fromEntries(previewProfiles.map((profile) => [profile.id, profile]))

export const socialPreviewViewerId = "preview-brandon"
export const socialPreviewCurrentProfile = profileById[socialPreviewViewerId]

const socialPreviewState = {
  currentUserId: socialPreviewViewerId,
  followingIds: ["preview-lena", "preview-mateo", "preview-riley", "preview-jules"],
  favoriteIds: ["preview-lena", "preview-riley"],
  mutedIds: ["preview-noah"],
}

const previewPosts: Post[] = [
  {
    id: "preview-post-lena-pb",
    user_id: "preview-lena",
    title: "Sub-8 single",
    content: "Finally hit 7.91 today. Best part is that the solve felt clean, not lucky.",
    post_type: "pb",
    visibility: "public",
    created_at: daysAgo(0, 20),
    updated_at: daysAgo(0, 20),
    profile: {
      display_name: profileById["preview-lena"].display_name,
      handle: profileById["preview-lena"].handle,
      avatar_url: profileById["preview-lena"].avatar_url,
    },
    media: [],
    tags: [
      createPostTag("preview-post-lena-pb", "pb", "3x3 single", daysAgo(0, 20), "preview-pb-lena", {
        event: "333",
        pb_type: "single",
        time_seconds: 7.91,
        scramble: "R U R' F2 U2 L2 D' R2 U F'",
      }),
    ],
    like_count: 14,
    has_liked: true,
    comment_count: 2,
  },
  {
    id: "preview-post-riley-comp",
    user_id: "preview-riley",
    title: "Sacramento Open recap",
    content:
      "Comp nerves were rough in round one, but finals felt like the calmest solving I have had all year.",
    post_type: "competition",
    visibility: "public",
    created_at: daysAgo(1, 18),
    updated_at: daysAgo(1, 18),
    profile: {
      display_name: profileById["preview-riley"].display_name,
      handle: profileById["preview-riley"].handle,
      avatar_url: profileById["preview-riley"].avatar_url,
    },
    media: [
      {
        id: "preview-media-riley-comp",
        post_id: "preview-post-riley-comp",
        media_type: "image",
        url: "https://picsum.photos/seed/sch-comp/1200/900",
        alt_text: "Competition recap photo",
        sort_order: 0,
        created_at: daysAgo(1, 18),
      },
      {
        id: "preview-media-riley-comp-2",
        post_id: "preview-post-riley-comp",
        media_type: "image",
        url: "https://picsum.photos/seed/sch-comp-2/1200/900",
        alt_text: "Competition recap crowd photo",
        sort_order: 1,
        created_at: daysAgo(1, 18),
      },
    ],
    tags: [
      createPostTag(
        "preview-post-riley-comp",
        "competition",
        "Sacramento Open 2026",
        daysAgo(1, 18),
        "SacramentoOpen2026",
        { city: "Sacramento" }
      ),
    ],
    like_count: 9,
    has_liked: true,
    comment_count: 1,
  },
  {
    id: "preview-post-mateo-session",
    user_id: "preview-mateo",
    title: "Session breakdown",
    content: "Big cubes were slower, but centers stayed consistent. That feels fixable.",
    post_type: "session_recap",
    visibility: "public",
    created_at: daysAgo(2, 21),
    updated_at: daysAgo(2, 21),
    profile: {
      display_name: profileById["preview-mateo"].display_name,
      handle: profileById["preview-mateo"].handle,
      avatar_url: profileById["preview-mateo"].avatar_url,
    },
    media: [],
    tags: [
      createPostTag("preview-post-mateo-session", "session", "5x5 session", daysAgo(2, 21), "preview-session-mateo", {
        event: "555",
      }),
    ],
    like_count: 6,
    has_liked: false,
    comment_count: 0,
  },
  {
    id: "preview-post-jules-text",
    user_id: "preview-jules",
    club_id: "preview-club-daily-solvers",
    title: "Challenge check-in",
    content: "Finished day four of the community solve streak. The feed makes me want to keep going.",
    post_type: "text",
    visibility: "club",
    created_at: daysAgo(0, 16),
    updated_at: daysAgo(0, 16),
    profile: {
      display_name: profileById["preview-jules"].display_name,
      handle: profileById["preview-jules"].handle,
      avatar_url: profileById["preview-jules"].avatar_url,
    },
    media: [],
    tags: [
      createPostTag("preview-post-jules-text", "challenge", "Community Solve Streak", daysAgo(0, 16), "preview-challenge-official"),
    ],
    like_count: 5,
    has_liked: false,
    comment_count: 0,
  },
  {
    id: "preview-post-sora-puzzle",
    user_id: "preview-sora",
    title: "New puzzle day",
    content: "Picked up a new magnetic Square-1 and I already know I am going to lose hours to it.",
    post_type: "text",
    visibility: "public",
    created_at: daysAgo(2, 16),
    updated_at: daysAgo(2, 16),
    profile: {
      display_name: profileById["preview-sora"].display_name,
      handle: profileById["preview-sora"].handle,
      avatar_url: profileById["preview-sora"].avatar_url,
    },
    media: [
      {
        id: "preview-media-sora-puzzle",
        post_id: "preview-post-sora-puzzle",
        media_type: "image",
        url: "https://picsum.photos/seed/sch-puzzle/1200/900",
        alt_text: "New puzzle desk photo",
        sort_order: 0,
        created_at: daysAgo(2, 16),
      },
    ],
    tags: [
      createPostTag("preview-post-sora-puzzle", "puzzle", "Magnetic Square-1", daysAgo(2, 16)),
    ],
    like_count: 8,
    has_liked: false,
    comment_count: 0,
  },
]

const previewSessions: SessionFeedEntry[] = [
  {
    id: "preview-session-brandon",
    user_id: "preview-brandon",
    session_date: daysAgo(0, 21).slice(0, 10),
    event: "333",
    practice_type: "Solves",
    num_solves: 87,
    num_dnf: 0,
    duration_minutes: 52,
    avg_time: 12.41,
    best_time: 8.92,
    title: "Evening 3x3 session",
    notes: "Cross stayed clean. Last 20 solves felt locked in.",
    feed_visible: true,
    created_at: daysAgo(0, 21),
    profile: {
      display_name: profileById["preview-brandon"].display_name,
      handle: profileById["preview-brandon"].handle,
      avatar_url: profileById["preview-brandon"].avatar_url,
    },
    like_count: 11,
    has_liked: false,
    comment_count: 1,
    best_ao5: 10.54,
    best_ao12: 11.12,
    best_ao25: 11.78,
    entry_type: "session",
    entry_created_at: daysAgo(0, 21),
  },
  {
    id: "preview-session-ari",
    user_id: "preview-ari",
    session_date: daysAgo(1, 15).slice(0, 10),
    event: "333",
    practice_type: "Slow Solves",
    num_solves: 32,
    num_dnf: 0,
    duration_minutes: 44,
    avg_time: 15.83,
    best_time: 11.24,
    title: "Slow solve cleanup",
    notes: "First pair recognition improved. Last mean was a real step forward.",
    feed_visible: true,
    created_at: daysAgo(1, 15),
    profile: {
      display_name: profileById["preview-ari"].display_name,
      handle: profileById["preview-ari"].handle,
      avatar_url: profileById["preview-ari"].avatar_url,
    },
    like_count: 4,
    has_liked: false,
    comment_count: 0,
    best_ao5: 13.94,
    best_ao12: 14.42,
    best_ao25: 15.07,
    entry_type: "session",
    entry_created_at: daysAgo(1, 15),
  },
  {
    id: "preview-session-noah",
    user_id: "preview-noah",
    session_date: daysAgo(1, 12).slice(0, 10),
    event: "sq1",
    practice_type: "Solves",
    num_solves: 42,
    num_dnf: 1,
    duration_minutes: 49,
    avg_time: 17.35,
    best_time: 11.88,
    title: "Square-1 morning session",
    notes: "Hit a clean shape shift streak halfway through.",
    feed_visible: true,
    created_at: daysAgo(1, 12),
    profile: {
      display_name: profileById["preview-noah"].display_name,
      handle: profileById["preview-noah"].handle,
      avatar_url: profileById["preview-noah"].avatar_url,
    },
    like_count: 2,
    has_liked: false,
    comment_count: 0,
    best_ao5: 13.02,
    best_ao12: 14.28,
    best_ao25: 15.33,
    entry_type: "session",
    entry_created_at: daysAgo(1, 12),
  },
]

const allFeedEntries: FeedEntry[] = [
  ...previewSessions,
  ...previewPosts.map((post) => ({
    ...post,
    entry_type: "post" as const,
    entry_created_at: post.created_at,
  })),
].sort((a, b) => Date.parse(b.entry_created_at) - Date.parse(a.entry_created_at))

const previewClubs: Club[] = [
  {
    id: "preview-club-daily-solvers",
    name: "Daily Solvers",
    description: "Public club for consistent practice and rich session recaps.",
    avatar_url: "https://api.dicebear.com/9.x/shapes/svg?seed=daily-solvers-club",
    pinned_post_id: "preview-post-lena-pb",
    created_by: "preview-brandon",
    visibility: "public",
    created_at: daysAgo(18, 13),
    member_count: 18,
    is_member: true,
    user_role: "owner",
  },
  {
    id: "preview-club-bootcamp",
    name: "Brandon Bootcamp",
    description: "Private coaching pod with weekly accountability challenges.",
    avatar_url: "https://api.dicebear.com/9.x/shapes/svg?seed=bootcamp-club",
    pinned_post_id: "preview-post-mateo-session",
    created_by: "preview-brandon",
    visibility: "private",
    created_at: daysAgo(12, 13),
    member_count: 6,
    is_member: true,
    user_role: "owner",
  },
]

const previewClubMembers: Record<string, ClubMember[]> = {
  "preview-club-daily-solvers": [
    {
      user_id: "preview-brandon",
      display_name: profileById["preview-brandon"].display_name,
      handle: profileById["preview-brandon"].handle,
      avatar_url: profileById["preview-brandon"].avatar_url,
      role: "owner",
      joined_at: daysAgo(18, 13),
    },
    {
      user_id: "preview-lena",
      display_name: profileById["preview-lena"].display_name,
      handle: profileById["preview-lena"].handle,
      avatar_url: profileById["preview-lena"].avatar_url,
      role: "member",
      joined_at: daysAgo(17, 13),
    },
    {
      user_id: "preview-mateo",
      display_name: profileById["preview-mateo"].display_name,
      handle: profileById["preview-mateo"].handle,
      avatar_url: profileById["preview-mateo"].avatar_url,
      role: "member",
      joined_at: daysAgo(16, 13),
    },
    {
      user_id: "preview-jules",
      display_name: profileById["preview-jules"].display_name,
      handle: profileById["preview-jules"].handle,
      avatar_url: profileById["preview-jules"].avatar_url,
      role: "member",
      joined_at: daysAgo(15, 13),
    },
  ],
  "preview-club-bootcamp": [
    {
      user_id: "preview-brandon",
      display_name: profileById["preview-brandon"].display_name,
      handle: profileById["preview-brandon"].handle,
      avatar_url: profileById["preview-brandon"].avatar_url,
      role: "owner",
      joined_at: daysAgo(12, 13),
    },
    {
      user_id: "preview-ari",
      display_name: profileById["preview-ari"].display_name,
      handle: profileById["preview-ari"].handle,
      avatar_url: profileById["preview-ari"].avatar_url,
      role: "member",
      joined_at: daysAgo(11, 13),
    },
    {
      user_id: "preview-riley",
      display_name: profileById["preview-riley"].display_name,
      handle: profileById["preview-riley"].handle,
      avatar_url: profileById["preview-riley"].avatar_url,
      role: "member",
      joined_at: daysAgo(10, 13),
    },
  ],
}

const previewChallenges: Challenge[] = [
  {
    id: "preview-challenge-official",
    title: "Community Solve Streak",
    description: "Log at least one session every day this week and post a recap.",
    type: "streak",
    scope: "official",
    club_id: null,
    target_value: 7,
    start_date: daysAgo(2, 9).slice(0, 10),
    end_date: daysAgo(-4, 18).slice(0, 10),
    created_at: daysAgo(2, 9),
    participant_count: 48,
    has_joined: true,
    user_progress: 4,
  },
  {
    id: "preview-challenge-bootcamp",
    title: "Bootcamp 150 Solves",
    description: "Private club challenge for the accountability pod.",
    type: "solves",
    scope: "club",
    club_id: "preview-club-bootcamp",
    target_value: 150,
    start_date: daysAgo(1, 9).slice(0, 10),
    end_date: daysAgo(-4, 18).slice(0, 10),
    created_at: daysAgo(1, 9),
    participant_count: 6,
    has_joined: true,
    user_progress: 120,
  },
]

const previewCommentThreads: Record<PreviewCommentTarget, Record<string, CommentThread[]>> = {
  post: {
    "preview-post-lena-pb": [
      {
        id: "preview-comment-pb-1",
        session_id: null,
        post_id: "preview-post-lena-pb",
        parent_comment_id: null,
        user_id: "preview-brandon",
        content: "This is exactly the kind of post that makes the app feel alive.",
        created_at: daysAgo(0, 20, 35),
        profile: {
          display_name: profileById["preview-brandon"].display_name,
          handle: profileById["preview-brandon"].handle,
          avatar_url: profileById["preview-brandon"].avatar_url,
        },
        replies: [
          {
            id: "preview-comment-pb-1-reply",
            session_id: null,
            post_id: "preview-post-lena-pb",
            parent_comment_id: "preview-comment-pb-1",
            user_id: "preview-lena",
            content: "Exactly. PBs should feel social, not like a spreadsheet update.",
            created_at: daysAgo(0, 20, 48),
            profile: {
              display_name: profileById["preview-lena"].display_name,
              handle: profileById["preview-lena"].handle,
              avatar_url: profileById["preview-lena"].avatar_url,
            },
          },
        ],
      },
    ],
    "preview-post-riley-comp": [
      {
        id: "preview-comment-comp-1",
        session_id: null,
        post_id: "preview-post-riley-comp",
        parent_comment_id: null,
        user_id: "preview-jules",
        content: "Need the full finals recap when you get a chance.",
        created_at: daysAgo(1, 18, 40),
        profile: {
          display_name: profileById["preview-jules"].display_name,
          handle: profileById["preview-jules"].handle,
          avatar_url: profileById["preview-jules"].avatar_url,
        },
        replies: [],
      },
    ],
  },
  session: {
    "preview-session-brandon": [
      {
        id: "preview-comment-session-1",
        session_id: "preview-session-brandon",
        post_id: null,
        parent_comment_id: null,
        user_id: "preview-lena",
        content: "That 8.92 best single is ridiculous.",
        created_at: daysAgo(0, 21, 32),
        profile: {
          display_name: profileById["preview-lena"].display_name,
          handle: profileById["preview-lena"].handle,
          avatar_url: profileById["preview-lena"].avatar_url,
        },
        replies: [],
      },
    ],
  },
}

export function getSocialPreviewSocialState() {
  return clone(socialPreviewState)
}

export function getSocialPreviewFollowingUsers() {
  return socialPreviewState.followingIds.map((id) => ({
    id,
    display_name: profileById[id].display_name,
    handle: profileById[id].handle,
    avatar_url: profileById[id].avatar_url,
    is_favorite: socialPreviewState.favoriteIds.includes(id),
  }))
}

export function getSocialPreviewFeed(mode: "following" | "explore" | "clubs") {
  const followedSet = new Set(socialPreviewState.followingIds)
  const mutedSet = new Set(socialPreviewState.mutedIds)
  const joinedClubIds = previewClubs.filter((club) => club.is_member).map((club) => club.id)
  const clubMemberIds = new Set(
    joinedClubIds.flatMap((clubId) => (previewClubMembers[clubId] ?? []).map((member) => member.user_id))
  )

  const items = allFeedEntries.filter((entry) => {
    if (mutedSet.has(entry.user_id)) return false
    if (mode === "following") {
      return entry.user_id === socialPreviewViewerId || followedSet.has(entry.user_id)
    }
    if (mode === "clubs") {
      if (entry.entry_type === "post" && entry.visibility === "club") {
        return joinedClubIds.includes(entry.club_id ?? "")
      }
      return clubMemberIds.has(entry.user_id)
    }
    return entry.user_id !== socialPreviewViewerId && !followedSet.has(entry.user_id)
  })

  const highlights = previewChallenges.filter((challenge) => {
    if (mode === "explore") {
      return challenge.scope === "official"
    }
    if (mode === "clubs") {
      return challenge.scope === "club" && joinedClubIds.includes(challenge.club_id ?? "")
    }
    return challenge.scope === "official" || challenge.has_joined
  })

  return {
    items: clone(items),
    highlights: clone(highlights),
    nextCursor: null,
    currentUserId: socialPreviewViewerId,
  }
}

export function searchSocialPreview(query: string): SearchResults {
  const safe = query.trim().toLowerCase()
  const searchablePosts = previewPosts.filter((post) => !socialPreviewState.mutedIds.includes(post.user_id))

  if (!safe) {
    return clone({
      profiles: previewProfiles.filter((profile) => profile.id !== socialPreviewViewerId && !socialPreviewState.mutedIds.includes(profile.id)).slice(0, 6),
      posts: searchablePosts.slice(0, 5),
      clubs: previewClubs.filter((club) => club.visibility === "public" || club.is_member),
      challenges: previewChallenges,
    })
  }

  return clone({
    profiles: previewProfiles.filter((profile) => {
      if (profile.id === socialPreviewViewerId || socialPreviewState.mutedIds.includes(profile.id)) {
        return false
      }

      return [profile.display_name, profile.handle, profile.location ?? "", profile.bio ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(safe)
    }),
    posts: searchablePosts.filter((post) =>
      [post.title ?? "", post.content, ...post.tags.map((tag) => tag.label)]
        .join(" ")
        .toLowerCase()
        .includes(safe)
    ),
    clubs: previewClubs.filter((club) => {
      if (club.visibility === "private" && !club.is_member) return false
      return [club.name, club.description ?? ""].join(" ").toLowerCase().includes(safe)
    }),
    challenges: previewChallenges.filter((challenge) =>
      [challenge.title, challenge.description ?? ""].join(" ").toLowerCase().includes(safe)
    ),
  })
}

export function getSocialPreviewClubs(query?: string) {
  const safe = query?.trim().toLowerCase() ?? ""
  const clubs = previewClubs.filter((club) => {
    if (club.visibility === "private" && !club.is_member) return false
    if (!safe) return true
    return [club.name, club.description ?? ""].join(" ").toLowerCase().includes(safe)
  })

  return clone({
    clubs,
    currentUserId: socialPreviewViewerId,
  })
}

export function getSocialPreviewUserClubs() {
  return clone({
    clubs: previewClubs.filter((club) => club.is_member),
  })
}

export function getSocialPreviewClub(clubId: string) {
  const club = previewClubs.find((item) => item.id === clubId) ?? null
  return clone({
    club,
    currentUserId: socialPreviewViewerId,
  })
}

export function getSocialPreviewClubMembers(clubId: string) {
  return clone({
    members: previewClubMembers[clubId] ?? [],
  })
}

export function getSocialPreviewClubFeed(clubId: string) {
  const memberIds = new Set((previewClubMembers[clubId] ?? []).map((member) => member.user_id))
  return clone({
    items: allFeedEntries.filter((entry) => {
      if (entry.entry_type === "post" && entry.visibility === "club") {
        return entry.club_id === clubId
      }
      return memberIds.has(entry.user_id)
    }),
    currentUserId: socialPreviewViewerId,
  })
}

export function getSocialPreviewClubChallenges(clubId: string) {
  return clone({
    challenges: previewChallenges.filter((challenge) => challenge.club_id === clubId),
    currentUserId: socialPreviewViewerId,
  })
}

export function getSocialPreviewChallenges() {
  return clone({
    data: previewChallenges,
    currentUserId: socialPreviewViewerId,
  })
}

export function getSocialPreviewClubLeaderboard(clubId: string) {
  const memberIds = new Set((previewClubMembers[clubId] ?? []).map((member) => member.user_id))
  const leaderboard = [...memberIds].map((memberId) => {
    const profile = profileById[memberId]
    const sessions = previewSessions.filter((session) => session.user_id === memberId)
    return {
      user_id: memberId,
      display_name: profile.display_name,
      handle: profile.handle,
      avatar_url: profile.avatar_url,
      session_count: sessions.length,
      total_solves: sessions.reduce((sum, session) => sum + (session.num_solves ?? 0), 0),
      total_minutes: sessions.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0),
      best_single: sessions.reduce<number | null>(
        (best, session) =>
          best === null
            ? session.best_time ?? null
            : session.best_time === null
              ? best
              : Math.min(best, session.best_time),
        null
      ),
      best_mean: sessions.reduce<number | null>(
        (best, session) =>
          best === null
            ? session.avg_time ?? null
            : session.avg_time === null
              ? best
              : Math.min(best, session.avg_time),
        null
      ),
    } satisfies ClubLeaderboardEntry
  })
    .sort((a, b) => {
      if (b.total_solves !== a.total_solves) return b.total_solves - a.total_solves
      if (b.session_count !== a.session_count) return b.session_count - a.session_count
      return a.display_name.localeCompare(b.display_name)
    })

  return clone({
    entries: leaderboard,
    windowDays: 30,
  })
}

export function getSocialPreviewCommentThreads(targetType: PreviewCommentTarget, targetId: string) {
  return clone(previewCommentThreads[targetType][targetId] ?? [])
}

export function buildSocialPreviewComment({
  targetType,
  targetId,
  content,
  parentCommentId,
}: {
  targetType: PreviewCommentTarget
  targetId: string
  content: string
  parentCommentId?: string | null
}): Comment {
  return {
    id: crypto.randomUUID(),
    session_id: targetType === "session" ? targetId : null,
    post_id: targetType === "post" ? targetId : null,
    parent_comment_id: parentCommentId ?? null,
    user_id: socialPreviewViewerId,
    content: content.trim(),
    created_at: new Date().toISOString(),
    profile: {
      display_name: socialPreviewCurrentProfile.display_name,
      handle: socialPreviewCurrentProfile.handle,
      avatar_url: socialPreviewCurrentProfile.avatar_url,
    },
  }
}

export function buildSocialPreviewPost({
  title,
  content,
  postType,
  clubId,
  imageUrls,
  tags,
}: {
  title: string
  content: string
  postType: PostType
  clubId?: string | null
  imageUrls: string[]
  tags: {
    tagType: PostTag["tag_type"]
    label: string
    referenceId?: string | null
    metadata?: Record<string, unknown>
  }[]
}): Post {
  const createdAt = new Date().toISOString()
  const postId = crypto.randomUUID()

  return {
    id: postId,
    user_id: socialPreviewViewerId,
    club_id: clubId ?? null,
    title: title.trim() || null,
    content: content.trim(),
    post_type: postType,
    visibility: clubId ? "club" : "public",
    created_at: createdAt,
    updated_at: createdAt,
    profile: {
      display_name: socialPreviewCurrentProfile.display_name,
      handle: socialPreviewCurrentProfile.handle,
      avatar_url: socialPreviewCurrentProfile.avatar_url,
    },
    media: imageUrls
      .filter((url) => url.trim().length > 0)
      .slice(0, 4)
      .map((url, index) => ({
        id: crypto.randomUUID(),
        post_id: postId,
        media_type: "image" as const,
        url: url.trim(),
        alt_text: title.trim() || "Feed image",
        sort_order: index,
        created_at: createdAt,
      })),
    tags: tags.map((tag) =>
      createPostTag(postId, tag.tagType, tag.label, createdAt, tag.referenceId, tag.metadata)
    ),
    like_count: 0,
    has_liked: false,
    comment_count: 0,
  }
}
