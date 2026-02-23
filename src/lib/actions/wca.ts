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
        personal_records: data.person.personal_records,
      },
    }
  } catch {
    return { data: null, error: "Failed to connect to WCA API" }
  }
}

export async function updateWcaId(
  wcaId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Validate WCA ID format if provided (e.g., 2024TRUE02)
  if (wcaId && wcaId.trim() !== "") {
    const trimmed = wcaId.trim().toUpperCase()

    // Basic format check: year + letters/digits
    if (!/^\d{4}[A-Z]{2,}\d{2}$/.test(trimmed)) {
      return { error: "Invalid WCA ID format. Example: 2024TRUE02" }
    }

    // Verify the WCA ID exists
    const { error: wcaError } = await getWcaResults(trimmed)
    if (wcaError) {
      return { error: `Could not verify WCA ID: ${wcaError}` }
    }

    const { error } = await supabase
      .from("profiles")
      .update({ wca_id: trimmed })
      .eq("id", user.id)

    if (error) {
      return { error: error.message }
    }
  } else {
    // Clear WCA ID
    const { error } = await supabase
      .from("profiles")
      .update({ wca_id: null })
      .eq("id", user.id)

    if (error) {
      return { error: error.message }
    }
  }

  return {}
}
