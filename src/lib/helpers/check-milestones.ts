import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check all milestone badges and auto-award any the user qualifies for.
 * Called after session creation.
 *
 * This is an internal helper — NOT a server action.
 * It must only be called from other server-side code.
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
    .select("id, name, description, icon, category, tier, criteria_type, criteria_value, verification")
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
    (sum: number, s: { num_solves: number | null }) => sum + (s.num_solves ?? 0),
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
      if (Math.round(diffDays) === 1) {
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
