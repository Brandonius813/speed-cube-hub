import { ChallengesContent } from "@/components/challenges/challenges-content"
import { checkIsAdmin } from "@/lib/actions/auth"
import { getChallenges } from "@/lib/actions/challenges"
import { getUserClubs } from "@/lib/actions/clubs"

export default async function ChallengesPage() {
  const { data: challenges, currentUserId } = await getChallenges()
  const isAdmin = await checkIsAdmin()
  const userClubs = currentUserId ? await getUserClubs(currentUserId) : { clubs: [] }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Challenges</h1>
      <ChallengesContent
        initialChallenges={challenges}
        currentUserId={currentUserId ?? null}
        isAdmin={isAdmin}
        availableClubs={userClubs.clubs}
      />
    </main>
  )
}
