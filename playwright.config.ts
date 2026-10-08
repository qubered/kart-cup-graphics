import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:8099', viewport: { width: 1920, height: 1200 } },
  projects: [{ name: 'chromium', use: { browserName: 'chromium', launchOptions: { executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' } } }],
  webServer: {
    command: 'npm run build && PORT=8099 DATA_DIR=.e2e-data tsx server/index.ts --fresh',
    url: 'http://localhost:8099/control',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
