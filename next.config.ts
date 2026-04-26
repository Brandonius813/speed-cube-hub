import type { NextConfig } from "next";

// NOTE: @serwist/next forces the webpack builder, which broke production builds on
// Next.js 16 with our `(main)` route group (missing `page_client-reference-manifest.js`).
// Disabling the PWA wrapper restores Turbopack builds. Files under src/app/sw.ts,
// public/manifest.webmanifest, src/components/shared/offline-indicator.tsx, and
// src/lib/timer/pending-saves.ts stay in the repo but are dormant until a Turbopack-
// compatible PWA path lands.

const nextConfig: NextConfig = {
  reactCompiler: process.env.NODE_ENV === "production",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
    optimizePackageImports: ["date-fns", "lucide-react", "recharts"],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
