"use server";

import { createClient } from "@/lib/supabase/server";
import type { Session } from "@/lib/types";

export async function getSessionsByUserId(
  userId: string
): Promise<{ data: Session[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("session_date", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as Session[]) || [] };
}

export async function createSession(data: {
  session_date: string;
  event: string;
  practice_type: string;
  num_solves: number;
  duration_minutes: number;
  avg_time: number | null;
  notes: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to log a session." };
  }

  const { error } = await supabase.from("sessions").insert({
    user_id: user.id,
    session_date: data.session_date,
    event: data.event,
    practice_type: data.practice_type,
    num_solves: data.num_solves,
    duration_minutes: data.duration_minutes,
    avg_time: data.avg_time,
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

  let query = supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("session_date", { ascending: false });

  if (filters?.event && filters.event !== "all") {
    query = query.eq("event", filters.event);
  }

  if (filters?.dateRange && filters.dateRange !== "all") {
    const now = new Date();
    const days =
      filters.dateRange === "7d"
        ? 7
        : filters.dateRange === "30d"
          ? 30
          : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    query = query.gte("session_date", startDate.toISOString().split("T")[0]);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as Session[]) || [] };
}

export async function createSessionsBulk(
  sessions: Array<{
    session_date: string;
    event: string;
    practice_type: string;
    num_solves: number;
    duration_minutes: number;
    avg_time: number | null;
    notes: string | null;
  }>
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

  const rows = sessions.map((s) => ({
    user_id: user.id,
    session_date: s.session_date,
    event: s.event,
    practice_type: s.practice_type,
    num_solves: s.num_solves,
    duration_minutes: s.duration_minutes,
    avg_time: s.avg_time,
    notes: s.notes || null,
  }));

  const { error } = await supabase.from("sessions").insert(rows);

  if (error) {
    return { inserted: 0, error: error.message };
  }

  return { inserted: rows.length };
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
      weeklyMinutes: 0,
      weeklyChange: 0,
    };
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("session_date", { ascending: false });

  if (!sessions || sessions.length === 0) {
    return {
      sessionsThisWeek: 0,
      totalMinutes: 0,
      currentStreak: 0,
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

  return {
    sessionsThisWeek,
    totalMinutes,
    currentStreak,
    weeklyMinutes,
    weeklyChange: sessionsThisWeek - lastWeekSessions,
  };
}
