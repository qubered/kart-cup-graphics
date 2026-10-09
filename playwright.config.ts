import { defineConfig } from '@playwright/test'
// E2E_PORT lets several checkouts (or agents) run the suite side by side.
const PORT = Number(process.env.E2E_PORT ?? 8099)
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: `http://localhost:${PORT}`, viewport: { width: 1920, height: 1200 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' } } }],
  webServer: {
    command: `npm run build && PORT=${PORT} DATA_DIR=.e2e-data tsx server/index.ts --fresh`,
    url: `http://localhost:${PORT}/control`,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
