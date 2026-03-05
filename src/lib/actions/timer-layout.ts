"use server"

import { createClient } from "@/lib/supabase/server"
import {
  timerPaneLayoutSchema,
  upsertTimerPaneLayoutSchema,
  zodFirstError,
} from "@/lib/validations"
import type { TimerPaneLayoutV1 } from "@/components/timer/panes/types"

export async function getTimerPaneLayout(
  layoutKey = "main"
): Promise<{ data: TimerPaneLayoutV1 | null; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: null, error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("timer_pane_layouts")
    .select("id,user_id,layout_key,layout,created_at,updated_at")
    .eq("user_id", user.id)
    .eq("layout_key", layoutKey)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message }
  }

  if (!data) {
    return { data: null }
  }

  const parsed = timerPaneLayoutSchema.safeParse(data.layout)
  if (!parsed.success) {
    return { data: null, error: zodFirstError(parsed.error) }
  }

  return { data: parsed.data }
}

export async function upsertTimerPaneLayout(
  layout: TimerPaneLayoutV1,
  layoutKey = "main"
): Promise<{ error?: string }> {
  const parsed = upsertTimerPaneLayoutSchema.safeParse({ layout, layoutKey })
  if (!parsed.success) {
    return { error: zodFirstError(parsed.error) }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("timer_pane_layouts").upsert(
    {
      user_id: user.id,
      layout_key: parsed.data.layoutKey,
      layout: parsed.data.layout,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,layout_key",
      ignoreDuplicates: false,
    }
  )

  if (error) {
    return { error: error.message }
  }

  return {}
}
