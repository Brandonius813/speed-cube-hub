"use server"

import { createClient } from "@/lib/supabase/server"

export type WcaRecord = {
  best: number // centiseconds (e.g., 1032 = 10.32s)
  world_rank: number
  continent_rank: number
  country_rank: number
}

export type WcaPersonalRecords = Record<
  string,
  {
    single?: WcaRecord
    average?: WcaRecord
  }
>

export type WcaPersonResult = {
  wca_id: string
  name: string
  country: { name: string }
  competition_count: number
  personal_records: WcaPersonalRecords
}

export async function getWcaResults(
  wcaId: string
): Promise<{ data: WcaPersonResult | null; error?: string }> {
  if (!wcaId || wcaId.trim() === "") {
    return { data: null, error: "No WCA ID provided" }
  }

  try {
    const res = await fetch(
      `https://www.worldcubeassociation.org/api/v0/persons/${encodeURIComponent(wcaId)}`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    )

    if (res.status === 404) {
      return { data: null, error: "WCA ID not found" }
    }

    if (!res.ok) {
      return { data: null, error: "Failed to fetch WCA results" }
    }

    const data = await res.json()

    return {
      data: {
        wca_id: data.person.wca_id,
        name: data.person.name,
        country: { name: data.person.country.name },
        competition_count: data.competition_count,
        personal_records: data.personal_records,
      },
    }
  } catch {
    return { data: null, error: "Failed to connect to WCA API" }
  }
}

export type WcaCompetition = {
  id: string
  name: string
  city: string
  country_iso2: string
  start_date: string
  end_date: string
  url: string
  venue: string
}

/** Fetch upcoming WCA competitions (public endpoint, no auth required) */
export async function getUpcomingCompetitions(
  countryIso2?: string
): Promise<{ data: WcaCompetition[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      sort: "start_date",
      per_page: "5",
      start: new Date().toISOString().split("T")[0],
    })
    if (countryIso2) {
      params.set("country_iso2", countryIso2)
    }

    const res = await fetch(
      `https://www.worldcubeassociation.org/api/v0/competitions?${params}`,
      { next: { revalidate: 3600 } } // cache for 1 hour
    )

    if (!res.ok) {
      return { data: [], error: "Failed to fetch upcoming competitions" }
    }

    const raw = await res.json()

    const competitions: WcaCompetition[] = (raw as Record<string, unknown>[]).map(
      (comp: Record<string, unknown>) => ({
        id: comp.id as string,
        name: comp.name as string,
        city: comp.city as string,
        country_iso2: comp.country_iso2 as string,
        start_date: comp.start_date as string,
        end_date: comp.end_date as string,
        url: comp.url as string,
        venue: (comp.venue as { name?: string })?.name ?? (comp.venue as string) ?? "",
      })
    )

    return { data: competitions }
  } catch {
    return { data: [], error: "Failed to connect to WCA API" }
  }
}

/** Remove the WCA ID from the current user's profile */
export async function unlinkWcaId(): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ wca_id: null })
    .eq("id", user.id)

  if (error) {
    return { error: error.message }
  }

  return {}
}
