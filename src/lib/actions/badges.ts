"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Badge, UserBadge, PendingBadgeClaim } from "@/lib/types";

/**
 * Get all badge definitions.
 */
export async function getBadgeDefinitions(): Promise<{
  data: Badge[];
  error?: string;
}> {
  const supabase = await createClient();

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
  const supabase = await createClient();

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

  // Verify the badge exists and is a competition badge
  const { data: badge } = await supabase
    .from("badges")
    .select("id, category, verification")
    .eq("id", badgeId)
    .single();

  if (!badge || badge.category !== "competition") {
    return { success: false, error: "Invalid competition badge." };
  }

  // Check for duplicate claim (same badge + year + detail)
  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", user.id)
    .eq("badge_id", badgeId)
    .eq("year", year)
    .eq("detail", detail.trim());

  if (existing && existing.length > 0) {
    return { success: false, error: "You already claimed this badge." };
  }

  const { error } = await supabase.from("user_badges").insert({
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

  // Find the "Sponsored Athlete" badge
  const { data: badge } = await supabase
    .from("badges")
    .select("id")
    .eq("name", "Sponsored Athlete")
    .single();

  if (!badge) {
    return { success: false, error: "Sponsor badge not found." };
  }

  // Check if user already has this badge
  const { data: existing } = await supabase
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

  const { error } = await supabase.from("user_badges").insert({
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

  const { error } = await supabase
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
 * Uses admin client because RLS only allows users to update their own badges.
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
 * Admin only: get all pending (unverified) badge claims with user profile info.
 * Uses admin client for cross-user reads with profile joins.
 */
export async function getPendingBadgeClaims(): Promise<{
  data: PendingBadgeClaim[];
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return { data: [], error: "Not authorized" };
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_badges")
    .select("*, badge:badges(*), profile:profiles(display_name, handle, avatar_url)")
    .eq("verified", false)
    .order("earned_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as PendingBadgeClaim[]) || [] };
}

/**
 * Admin only: reject (delete) a badge claim.
 * Uses admin client because RLS only allows users to delete their own badges.
 */
export async function rejectBadge(
  userBadgeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== process.env.ADMIN_USER_ID) {
    return { success: false, error: "Not authorized" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("user_badges")
    .delete()
    .eq("id", userBadgeId)
    .eq("verified", false);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
