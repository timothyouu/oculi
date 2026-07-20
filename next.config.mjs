/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Escape hatch for environments without outbound network to the image
    // hosts (the Playwright e2e web server sets this): the optimizer's
    // server-side fetch to upload.wikimedia.org would otherwise hang for
    // ~10s per image and block the page `load` event past test timeouts.
    unoptimized: process.env.OCULI_UNOPTIMIZED_IMAGES === "1",
    remotePatterns: [
      // Seed catalog cover/photo hotlinks (lib/data.ts) -- see CLAUDE.md
      // Architecture Notes on demo-to-product Task 9 (image pipeline).
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/wikipedia/commons/**",
      },
      // Real uploaded photos land in Supabase Storage's public bucket URL
      // (lib/remote-state.ts `saveRemoteCatalogPhoto` -> oculi-photos bucket).
      {
        protocol: "https",
        hostname: "xlzknvhiuhtcqmqrypqh.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
