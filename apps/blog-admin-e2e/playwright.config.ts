import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const apiHost = process.env.API_HOST ?? 'localhost';
const apiPort = process.env.API_PORT ?? '3000';

const adminBlogHost = process.env.VITE_ADMIN_BLOG_HOST ?? 'localhost';
const adminBlogPort = process.env.VITE_ADMIN_BLOG_PORT ?? '5173';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './e2e' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: `http://${adminBlogHost}:${adminBlogPort}`,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  maxFailures: process.env.CI ? 1 : 0,
  // (DO NOT CHANGE) Specify workers to 1 to provide stability and reproductivity
  workers: 1,
  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npx nx serve:e2e @dans-coding-world/api',
      url: `http://${apiHost}:${apiPort}/api-docs`,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
    },
    {
      command: 'npx nx dev blog-admin',
      url: `http://${adminBlogHost}:${adminBlogPort}`,
      reuseExistingServer: !process.env.CI,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    // {
    //   name: 'chromium',
    //   use: { ...devices['Desktop Chrome'] },
    // },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */
    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
