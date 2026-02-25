"use server";

import { createClient } from "@/lib/supabase/server";
import { checkAndAwardMilestones } from "@/lib/helpers/check-milestones";
import { createSessionSchema, bulkSessionItemSchema, zodFirstError } from "@/lib/validations";
import type { Session } from "@/lib/types";

// Supabase caps each request at ~1000 rows by default (PostgREST max-rows).
// This helper paginates to fetch ALL matching rows.
const PAGE_SIZE = 1000;

async function fetchAllPages(
  queryFn: (from: number, to: number) => ReturnType<ReturnType<Awaited<ReturnType<typeof createClient>>["from"]>["select"]>
): Promise<{ data: Session[]; error?: string }> {
  const all: Session[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1);
    if (error) return { data: [], error: error.message };
    if (!data || data.length === 0) break;
    all.push(...(data as Session[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { data: all };
}

export async function getSessionsByUserId(
  userId: string
): Promise<{ data: Session[]; error?: string }> {
  const supabase = await createClient();

  return fetchAllPages((from, to) =>
    supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId)
      .order("session_date", { ascending: false })
      .range(from, to)
  );
}

export async function createSession(data: {
  session_date: string;
  event: string;
  practice_type: string;
  num_solves: number | null;
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
    num_solves: data.num_solves,
    duration_minutes: data.duration_minutes,
    avg_time: data.avg_time,
    best_time: data.best_time,
    title: data.title || null,
    notes: data.notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  // Check and auto-award milestone badges (runs in background, doesn't block response)
  checkAndAwardMilestones(user.id).catch(() => {
    // Silently ignore errors — milestone check is not critical
  });

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

export async function createSessionsBulk(
  sessions: Array<{
    session_date: string;
    event: string;
    practice_type: string;
    num_solves: number | null;
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
      num_solves: data.num_solves,
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

  const { data: sessions } = await fetchAllPages((from, to) =>
    supabase
      .from("sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("session_date", { ascending: false })
      .range(from, to)
  );

  if (!sessions || sessions.length === 0) {
    return {
      sessionsThisWeek: 0,
      totalMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      weeklyMinutes: 0,
      weeklyChange: 0,
    };
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  let sessionsThisWeek = 0;
  let weeklyMinutes = 0;
  let lastWeekSessions = 0;
  let totalMinutes = 0;

  for (const session of sessions) {
    const sessionDate = new Date(session.session_date + "T00:00:00");
    totalMinutes += session.duration_minutes;

    if (sessionDate >= startOfWeek) {
      sessionsThisWeek++;
      weeklyMinutes += session.duration_minutes;
    } else if (sessionDate >= lastWeekStart && sessionDate < startOfWeek) {
      lastWeekSessions++;
    }
  }

  // Calculate current streak (consecutive days with practice)
  const uniqueDates = [
    ...new Set(sessions.map((s: Session) => s.session_date)),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let currentStreak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    const latestSession = new Date(uniqueDates[0] + "T00:00:00");
    if (latestSession < today) {
      checkDate = latestSession;
    }

    for (const dateStr of uniqueDates) {
      const sessionDate = new Date(dateStr + "T00:00:00");
      if (sessionDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (sessionDate < checkDate) {
        break;
      }
    }
  }

  // Calculate longest streak (all-time)
  let longestStreak = 0;
  if (uniqueDates.length > 0) {
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
      const curr = new Date(uniqueDates[i] + "T00:00:00");
      const diffDays = (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  return {
    sessionsThisWeek,
    totalMinutes,
    currentStreak,
    longestStreak,
    weeklyMinutes,
    weeklyChange: sessionsThisWeek - lastWeekSessions,
  };
}
