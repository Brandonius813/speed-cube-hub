const DEFAULT_DISCORD_INVITE_URL = "https://discord.gg/VYAYUsVbDw"

const discordInviteUrl =
  process.env.NEXT_PUBLIC_SPEEDCUBEHUB_DISCORD_INVITE_URL?.trim() ||
  DEFAULT_DISCORD_INVITE_URL

export const COMMUNITY_LINKS = {
  discord: discordInviteUrl,
} as const
