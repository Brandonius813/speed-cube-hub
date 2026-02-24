"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Badge, UserBadge } from "@/lib/types";

/**
 * Get all badge definitions.
 */
export async function getBadgeDefinitions(): Promise<{
  data: Badge[];
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .order("category")
    .order("tier");

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as Badge[]) || [] };
}

/**
 * Get all badges earned by a user, joined with badge definition.
 */
export async function getUserBadges(
  userId: string
): Promise<{ data: UserBadge[]; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_badges")
    .select("*, badge:badges(*)")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as UserBadge[]) || [] };
}

/**
 * Claim a competition credential (creates unverified user_badge).
 * The badge shows as "Pending" until an admin approves it.
 */
export async function claimCompetitionBadge(
  badgeId: string,
  year: number,
  detail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!badgeId || !year || !detail?.trim()) {
    return { success: false, error: "Badge, year, and detail are required." };
  }

  const admin = createAdminClient();

  // Verify the badge exists and is a competition badge
  const { data: badge } = await admin
    .from("badges")
    .select("id, category, verification")
    .eq("id", badgeId)
    .single();

  if (!badge || badge.category !== "competition") {
    return { success: false, error: "Invalid competition badge." };
  }

  // Check for duplicate claim (same badge + year + detail)
  const { data: existing } = await admin
    .from("user_badges")
    .select("id")
    .eq("user_id", user.id)
    .eq("badge_id", badgeId)
    .eq("year", year)
    .eq("detail", detail.trim());

  if (existing && existing.length > 0) {
    return { success: false, error: "You already claimed this badge." };
  }

  const { error } = await admin.from("user_badges").insert({
    user_id: user.id,
    badge_id: badgeId,
    year,
    detail: detail.trim(),
    is_current: false,
    verified: false, // Requires admin approval
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Claim sponsor badge with sponsor name as detail.
 * Verified immediately (self-reported).
 */
export async function claimSponsorBadge(
  sponsorName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!sponsorName?.trim()) {
    return { success: false, error: "Sponsor name is required." };
  }

  const admin = createAdminClient();

  // Find the "Sponsored Athlete" badge
  const { data: badge } = await admin
    .from("badges")
    .select("id")
    .eq("name", "Sponsored Athlete")
    .single();

  if (!badge) {
    return { success: false, error: "Sponsor badge not found." };
  }

  // Check if user already has this badge
  const { data: existing } = await admin
    .from("user_badges")
    .select("id")
    .eq("user_id", user.id)
    .eq("badge_id", badge.id);

  if (existing && existing.length > 0) {
    return {
      success: false,
      error: "You already have a sponsor badge. Remove it first to update.",
    };
  }

  const { error } = await admin.from("user_badges").insert({
    user_id: user.id,
    badge_id: badge.id,
    detail: sponsorName.trim(),
    verified: true, // Self-reported, no approval needed
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove own badge.
 */
export async function removeBadge(
  userBadgeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_badges")
    .delete()
    .eq("id", userBadgeId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Admin only: approve a badge claim (sets verified=true).
 */
export async function approveBadge(
  userBadgeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Admin check
  if (user.id !== process.env.ADMIN_USER_ID) {
    return { success: false, error: "Not authorized" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_badges")
    .update({ verified: true })
    .eq("id", userBadgeId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Check all milestone badges and auto-award any the user qualifies for.
 * Called after session creation.
 *
 * Calculates:
 * - Total solves: sum of num_solves from sessions
 * - Longest streak: consecutive days with sessions
 * - Total hours: sum of duration_minutes (criteria_value is in minutes)
 * - Distinct events: count of distinct event values from sessions
 */
export async function checkAndAwardMilestones(
  userId: string
): Promise<void> {
  const admin = createAdminClient();

  // Get all milestone badges
  const { data: milestoneBadges } = await admin
    .from("badges")
    .select("*")
    .eq("category", "milestone")
    .eq("verification", "auto");

  if (!milestoneBadges || milestoneBadges.length === 0) return;

  // Get user's existing milestone badges
  const { data: existingBadges } = await admin
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const earnedBadgeIds = new Set(
    (existingBadges || []).map((b: { badge_id: string }) => b.badge_id)
  );

  // Get user's sessions for calculations
  const { data: sessions } = await admin
    .from("sessions")
    .select("num_solves, duration_minutes, event, session_date")
    .eq("user_id", userId)
    .order("session_date", { ascending: false });

  if (!sessions || sessions.length === 0) return;

  // Calculate stats
  const totalSolves = sessions.reduce(
    (sum: number, s: { num_solves: number }) => sum + s.num_solves,
    0
  );

  const totalMinutes = sessions.reduce(
    (sum: number, s: { duration_minutes: number }) => sum + s.duration_minutes,
    0
  );

  const distinctEvents = new Set(
    sessions.map((s: { event: string }) => s.event)
  ).size;

  // Calculate longest streak (consecutive days with sessions)
  const uniqueDates = [
    ...new Set(
      sessions.map((s: { session_date: string }) => s.session_date)
    ),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let longestStreak = 0;
  if (uniqueDates.length > 0) {
    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T00:00:00");
      const curr = new Date(uniqueDates[i] + "T00:00:00");
      const diffDays =
        (prev.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000);
      if (diffDays === 1) {
        streak++;
      } else {
        longestStreak = Math.max(longestStreak, streak);
        streak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, streak);
  }

  // Check each milestone badge
  const badgesToAward: string[] = [];

  for (const badge of milestoneBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    if (!badge.criteria_type || !badge.criteria_value) continue;

    let qualifies = false;

    switch (badge.criteria_type) {
      case "solves":
        qualifies = totalSolves >= badge.criteria_value;
        break;
      case "streak":
        qualifies = longestStreak >= badge.criteria_value;
        break;
      case "hours":
        // criteria_value is stored in minutes (e.g., 6000 = 100 hours)
        qualifies = totalMinutes >= badge.criteria_value;
        break;
      case "events":
        qualifies = distinctEvents >= badge.criteria_value;
        break;
    }

    if (qualifies) {
      badgesToAward.push(badge.id);
    }
  }

  // Award badges
  if (badgesToAward.length > 0) {
    const rows = badgesToAward.map((badgeId) => ({
      user_id: userId,
      badge_id: badgeId,
      verified: true,
    }));

    await admin.from("user_badges").insert(rows);
  }
}
