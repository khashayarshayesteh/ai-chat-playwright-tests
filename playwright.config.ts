import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: '.auth/guest.json' },
    },
    { name: 'eval', testMatch: /eval\/.*\.spec\.ts/ }, // API-level, no browser needed
  ],

  webServer: {
    command: 'npx tsx app/server.ts',
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
});
