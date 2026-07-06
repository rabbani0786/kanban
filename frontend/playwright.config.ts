import { defineConfig, devices } from "@playwright/test";

const FRONTEND_PORT = 3100;
const BACKEND_PORT = 8100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "python -m uv run --no-sync uvicorn app.main:app --port 8100",
      cwd: "../backend",
      url: `http://localhost:${BACKEND_PORT}/health`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        DATABASE_PATH: "e2e-test.db",
        RESET_DB_ON_STARTUP: "1",
      },
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}`,
      },
    },
  ],
});
