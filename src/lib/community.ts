const discordInviteUrl =
  process.env.NEXT_PUBLIC_SPEEDCUBEHUB_DISCORD_INVITE_URL?.trim() || null

export const COMMUNITY_LINKS = {
  discord: discordInviteUrl,
} as const
