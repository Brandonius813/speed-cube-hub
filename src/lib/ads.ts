export const ADSENSE_CLIENT_ID = "ca-pub-3027565303141354";

export const ADSENSE_SLOT_IDS = {
  homeInline:
    process.env.NEXT_PUBLIC_ADSENSE_HOME_INLINE_SLOT ?? "4601663636",
  feedInline:
    process.env.NEXT_PUBLIC_ADSENSE_FEED_INLINE_SLOT ?? "7327899325",
  profileSidebar:
    process.env.NEXT_PUBLIC_ADSENSE_PROFILE_SIDEBAR_SLOT ?? "4450454545",
  leaderboardsSidebar:
    process.env.NEXT_PUBLIC_ADSENSE_LEADERBOARDS_SIDEBAR_SLOT ?? "1828160635",
} as const;
