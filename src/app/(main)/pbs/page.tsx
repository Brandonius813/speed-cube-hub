import { PBsContent } from "@/components/pbs/pbs-content"
import { getCurrentPBs } from "@/lib/actions/personal-bests"
import { getProfile } from "@/lib/actions/profiles"

export default async function PBsPage() {
  const [{ data: currentPBs }, { profile }] = await Promise.all([
    getCurrentPBs(),
    getProfile(),
  ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Personal Bests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your PB history across all events. Click any time to see its full history.
        </p>
      </div>
      <PBsContent
        initialPBs={currentPBs}
        initialVisibleTypes={profile?.pb_visible_types ?? null}
        initialMainEvents={profile?.pbs_main_events ?? null}
      />
    </main>
  )
}
