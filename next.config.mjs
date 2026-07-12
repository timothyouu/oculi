/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Remote hosts actually present in lib/data.ts imageUrl/avatarUrl/coverPhotoUrl values,
    // plus the Supabase storage host that serves user-uploaded photos (Task 9, image pipeline
    // migration to next/image, docs/demo-to-product-audit.md item 10).
    remotePatterns: [
      {
        // Curated place/photo imagery sourced from Wikimedia Commons (see lib/image-attribution.ts).
        // NOTE: Wikimedia images are rendered with `unoptimized` (shouldBypassImageOptimizer) so
        // browsers fetch them directly -- Wikimedia 429-rate-limits the optimizer's single server
        // IP. This entry stays as a safety net so any future non-bypassed next/image usage of a
        // Wikimedia URL degrades to slow/429 instead of throwing an unconfigured-host error.
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        // Legacy/possible Unsplash imagery -- also handled by ResilientImage's dead
        // source.unsplash.com rewrite and by lib/image-attribution.ts.
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // User-uploaded photos, served from the Supabase "oculi-photos" storage bucket
        // (lib/remote-state.ts uploadRemotePhoto / getPublicUrl).
        protocol: "https",
        hostname: "xlzknvhiuhtcqmqrypqh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
