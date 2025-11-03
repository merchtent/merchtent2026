import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      // add others you use:
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'kmfmmmdzmjrxhgqurrdn.supabase.co' }
    ],
  },
  eslint: {
    // ⚠️ Lint still runs locally if you want, but it's skipped during `next build`
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
