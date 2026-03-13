import type { MetadataRoute } from "next";

const SITE_URL = "https://www.speedcubehub.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/dashboard",
          "/feed",
          "/getting-started/",
          "/import",
          "/log",
          "/login",
          "/notifications",
          "/signup",
          "/timer",
          "/wrapped",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
