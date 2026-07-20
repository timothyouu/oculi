import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3107);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "playwright-demo-key",
      // Skip the next/image optimizer under e2e: its server-side fetches to
      // the remote image hosts hang in offline/sandboxed runs and stall the
      // page `load` event (see next.config.mjs images.unoptimized).
      OCULI_UNOPTIMIZED_IMAGES: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
