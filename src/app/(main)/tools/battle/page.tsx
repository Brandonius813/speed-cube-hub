import { getProfile } from "@/lib/actions/profiles"
import { BattleContent } from "@/components/tools/battle-content"

export const metadata = {
  title: "Battle Mode — SpeedCubeHub",
  description: "Challenge friends to real-time cubing battles with shared scrambles",
}

export default async function BattlePage() {
  const { profile } = await getProfile()

  const player = profile
    ? {
        userId: profile.id,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url ?? undefined,
      }
    : null

  return <BattleContent player={player} />
}
