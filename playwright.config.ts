import { defineConfig, devices } from '@playwright/test';

const rawBaseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const baseURL = rawBaseURL.endsWith('/') ? rawBaseURL : `${rawBaseURL}/`;
const useWebServer = process.env.E2E_USE_WEBSERVER === 'true' || (!process.env.E2E_USE_WEBSERVER && baseURL.includes('localhost'));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: useWebServer
    ? {
        command: 'env -u VITE_SUPABASE_URL -u VITE_SUPABASE_ANON_KEY npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
