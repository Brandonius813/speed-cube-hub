"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchAllPages } from "@/lib/helpers/fetch-all-pages";
import { createSessionSchema, bulkSessionItemSchema, zodFirstError } from "@/lib/validations";
import type { Session } from "@/lib/types";

const PAGE_SIZE = 1000;

export async function getSessionsByUserId(
  userId: string
): Promise<{ data: Session[]; error?: string }> {
  const supabase = await createClient();

  return fetchAllPages((from, to) => (
    supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("session_date", { ascending: false })
      .range(from, to)
  ));
}

async function sumPracticeMinutesForUser(userId: string): Promise<number> {
  const supabase = await createClient();
  let totalMinutes = 0;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("sessions")
      .select("duration_minutes")
      .eq("user_id", userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data || data.length === 0) break;

    for (const row of data) {
      totalMinutes += row.duration_minutes ?? 0;
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return totalMinutes;
}

export async function getTotalPracticeMinutes(): Promise<{
  totalMinutes: number
  error?: string
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { totalMinutes: 0, error: "Not authenticated" };
  }

  return { totalMinutes: await sumPracticeMinutesForUser(user.id) };
}

export async function getTotalPracticeMinutesByUserId(
  userId: string
): Promise<{
  totalMinutes: number
  error?: string
}> {
  return { totalMinutes: await sumPracticeMinutesForUser(userId) };
}

export async function createSession(data: {
  session_date: string;
  event: string;
  practice_type: string;
  num_solves: number | null;
  num_dnf: number | null;
  duration_minutes: number;
  avg_time: number | null;
  best_time: number | null;
  title: string | null;
  notes: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to log a session." };
  }

  const parsed = createSessionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: zodFirstError(parsed.error) };
  }

  const { error } = await supabase.from("sessions").insert({
    user_id: user.id,
    session_date: data.session_date,
    event: data.event,
    practice_type: data.practice_type,
    num_solves: data.num_solves ?? 0,
    num_dnf: data.num_dnf ?? 0,
    duration_minutes: data.duration_minutes,
    avg_time: data.avg_time,
    best_time: data.best_time,
    title: data.title || null,
    notes: data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function getSessions(filters?: {
  event?: string;
  dateRange?: "7d" | "30d" | "90d" | "all";
}): Promise<{ data: Session[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: "Not authenticated" };
  }

  const eventFilter = filters?.event && filters.event !== "all" ? filters.event : null;
  let dateFilter: string | null = null;
  if (filters?.dateRange && filters.dateRange !== "all") {
    const now = new Date();
    const days =
      filters.dateRange === "7d"
        ? 7
        : filters.dateRange === "30d"
          ? 30
          : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    dateFilter = startDate.toISOString().split("T")[0];
  }

  return fetchAllPages((from, to) => {
    let query = supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .range(from, to);

    if (eventFilter) query = query.eq("event", eventFilter);
    if (dateFilter) query = query.gte("session_date", dateFilter);

    return query;
  });
}

export async function getCompSimBenchmarks(
  event: string,
  excludeSessionId?: string
): Promise<{
  previousCompSimResultSeconds: number | null
  normalBaselineSeconds: number | null
  error?: string
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      previousCompSimResultSeconds: null,
      normalBaselineSeconds: null,
      error: "Not authenticated",
    };
  }

  let compSimQuery = supabase
    .from("sessions")
    .select("id, comp_sim_result_seconds")
    .eq("user_id", user.id)
    .eq("event", event)
    .eq("practice_type", "Comp Sim")
    .not("comp_sim_result_seconds", "is", null)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (excludeSessionId) {
    compSimQuery = compSimQuery.neq("id", excludeSessionId);
  }

  const { data: compSimRows, error: compSimError } = await compSimQuery;
  if (compSimError) {
    return {
      previousCompSimResultSeconds: null,
      normalBaselineSeconds: null,
      error: compSimError.message,
    };
  }

  const { data: normalRows, error: normalError } = await supabase
    .from("sessions")
    .select("avg_time")
    .eq("user_id", user.id)
    .eq("event", event)
    .eq("practice_type", "Solves")
    .not("avg_time", "is", null)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (normalError) {
    return {
      previousCompSimResultSeconds: (compSimRows?.[0]?.comp_sim_result_seconds as number | null) ?? null,
      normalBaselineSeconds: null,
      error: normalError.message,
    };
  }

  const baselineValues = (normalRows ?? [])
    .map((row: { avg_time: number | null }) => row.avg_time)
    .filter((value: number | null): value is number => value !== null);

  return {
      previousCompSimResultSeconds: (compSimRows?.[0]?.comp_sim_result_seconds as number | null) ?? null,
      normalBaselineSeconds:
      baselineValues.length > 0
        ? baselineValues.reduce((sum: number, value: number) => sum + value, 0) / baselineValues.length
        : null,
  };
}

export async function createSessionsBulk(
  sessions: Array<{
    session_date: string;
    event: string;
    practice_type: string;
    num_solves: number | null;
    num_dnf: number | null;
    duration_minutes: number;
    avg_time: number | null;
    best_time: number | null;
    notes: string | null;
  }>,
  options?: { source?: string }
): Promise<{ inserted: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { inserted: 0, error: "You must be logged in to import sessions." };
  }

  if (sessions.length === 0) {
    return { inserted: 0, error: "No sessions to import." };
  }

  if (sessions.length > 500) {
    return { inserted: 0, error: "Maximum 500 sessions per import." };
  }

  // Validate every row
  for (let i = 0; i < sessions.length; i++) {
    const parsed = bulkSessionItemSchema.safeParse(sessions[i]);
    if (!parsed.success) {
      return {
        inserted: 0,
        error: `Row ${i + 1}: ${zodFirstError(parsed.error)}`,
      };
    }
  }

  const source = options?.source;
  const hideFromFeed = !!source && sessions.length > 1;

  // Find the most recent session to be the "representative" in the feed.
  // All other imported sessions are hidden from the feed so they don't
  // flood followers' timelines.
  let representativeIdx = 0;
  if (hideFromFeed) {
    for (let i = 1; i < sessions.length; i++) {
      if (sessions[i].session_date > sessions[representativeIdx].session_date) {
        representativeIdx = i;
      }
    }
  }

  const rows = sessions.map((s, i) => {
    const isRepresentative = hideFromFeed && i === representativeIdx;
    return {
      user_id: user.id,
      session_date: s.session_date,
      event: s.event,
      practice_type: s.practice_type,
      num_solves: s.num_solves,
      num_dnf: s.num_dnf ?? 0,
      duration_minutes: s.duration_minutes,
      avg_time: s.avg_time,
      best_time: s.best_time,
      notes: s.notes || null,
      ...(hideFromFeed ? { feed_visible: i === representativeIdx } : {}),
      ...(isRepresentative
        ? {
            title: `Imported ${sessions.length} session${sessions.length !== 1 ? "s" : ""} from ${source}`,
          }
        : {}),
    };
  });

  const { error } = await supabase.from("sessions").insert(rows);

  if (error) {
    return { inserted: 0, error: error.message };
  }

  return { inserted: rows.length };
}

export async function updateSession(
  sessionId: string,
  data: {
    session_date: string;
    event: string;
    practice_type: string;
    num_solves: number | null;
    num_dnf: number | null;
    duration_minutes: number;
    avg_time: number | null;
    best_time: number | null;
    title: string | null;
    notes: string | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to edit a session." };
  }

  const parsed = createSessionSchema.safeParse(data);
  if (!parsed.success) {
    return { error: zodFirstError(parsed.error) };
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      session_date: data.session_date,
      event: data.event,
      practice_type: data.practice_type,
      num_solves: data.num_solves ?? 0,
      num_dnf: data.num_dnf ?? 0,
      duration_minutes: data.duration_minutes,
      avg_time: data.avg_time,
      best_time: data.best_time,
      title: data.title || null,
      notes: data.notes || null,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function deleteSession(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to delete a session." };
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function deleteSessionsBulk(
  sessionIds: string[]
): Promise<{ deleted: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { deleted: 0, error: "You must be logged in to delete sessions." };
  }

  if (sessionIds.length === 0) {
    return { deleted: 0, error: "No sessions selected." };
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .in("id", sessionIds)
    .eq("user_id", user.id);

  if (error) {
    return { deleted: 0, error: error.message };
  }

  return { deleted: sessionIds.length };
}

export async function getSessionStats() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      sessionsThisWeek: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      weeklyMinutes: 0,
      weeklyChange: 0,
    };
  }

  // Only fetch the two columns needed for stats — NOT select("*")
  const all: Array<{ session_date: string; duration_minutes: number }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("sessions")
      .select("session_date, duration_minutes")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // Delegate to the shared utility (same logic, no duplication)
  const { computeSessionStats } = await import("@/lib/utils");
  return computeSessionStats(all);
}
