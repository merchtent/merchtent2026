import type { NextConfig } from "next";

function optionalUrlHostname(key: string) {
  const value = process.env[key];
  if (!value) return undefined;

  try {
    return new URL(value).hostname;
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL`);
  }
}

const supabaseHost = optionalUrlHostname("NEXT_PUBLIC_SUPABASE_URL");

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      ...(supabaseHost
        ? [
          {
            protocol: "https" as const,
            hostname: supabaseHost,
          },
        ]
        : []),
    ],
  },
};

export default nextConfig;
