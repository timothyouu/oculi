import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3107);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // This WSL2 machine reports 22 cores but has only ~15GB RAM; Playwright's
  // default worker count (half the cores = 11 Chromium instances alongside
  // `next dev`) starves the heavy live-Mapbox specs and a random test times
  // out each run. Four workers is reliably below the memory ceiling.
  workers: process.env.CI ? undefined : 4,
  // Even with capped workers, specs on this machine run 25-35s under load
  // and the 30s default budget kills a random near-finished test each run.
  timeout: 60_000,
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
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
