import { ClubsContent } from "@/components/clubs/clubs-content"
import { getClubs } from "@/lib/actions/clubs"

export default async function ClubsPage() {
  const { clubs, currentUserId } = await getClubs()

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Clubs</h1>
      <ClubsContent initialClubs={clubs} currentUserId={currentUserId ?? null} />
    </main>
  )
}
