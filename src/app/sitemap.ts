import { createClient } from "@supabase/supabase-js";
import type { MetadataRoute } from "next";

const SITE_URL = "https://www.speedcubehub.com";

export const revalidate = 3600;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/leaderboards", changeFrequency: "daily", priority: 0.9 },
  { path: "/discover", changeFrequency: "daily", priority: 0.9 },
  { path: "/clubs", changeFrequency: "daily", priority: 0.8 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return staticEntries;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("profiles")
      .select("handle, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error || !data) {
      return staticEntries;
    }

    const profileEntries: MetadataRoute.Sitemap = data
      .filter((profile) => typeof profile.handle === "string" && profile.handle.length > 0)
      .map((profile) => ({
        url: `${SITE_URL}/profile/${profile.handle}`,
        lastModified: profile.updated_at ?? now.toISOString(),
        changeFrequency: "weekly",
        priority: 0.7,
      }));

    return [...staticEntries, ...profileEntries];
  } catch {
    return staticEntries;
  }
}
