import { fileURLToPath, URL } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));

export const userClientUrl = "http://localhost:5183";
export const adminClientUrl = "http://localhost:5184";
export const apiUrl = "http://localhost:3010";

const apiEnvironment = {
  API_PORT: "3010",
  BETTER_AUTH_URL: apiUrl,
  USER_CLIENT_URL: userClientUrl,
  ADMIN_CLIENT_URL: adminClientUrl,
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
};

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./prepareDatabase.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    locale: "en-US",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "user-client",
      testMatch: /user\..*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: userClientUrl },
    },
    {
      name: "admin-client",
      testMatch: /admin\..*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: adminClientUrl },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: `${apiUrl}/health`,
      cwd: workspaceRoot,
      env: apiEnvironment,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter user-client exec vite --port 5183 --strictPort",
      url: userClientUrl,
      cwd: workspaceRoot,
      env: { VITE_API_URL: apiUrl },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter admin-client exec vite --port 5184 --strictPort",
      url: adminClientUrl,
      cwd: workspaceRoot,
      env: { VITE_API_URL: apiUrl },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
