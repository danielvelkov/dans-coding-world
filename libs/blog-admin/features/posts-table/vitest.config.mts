import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig(() => ({
  plugins: [svelte({ compilerOptions: { hmr: false } })],
  root: __dirname,
  cacheDir:
    '../../../../node_modules/.vite/libs/blog-admin/features/posts-table',
  // Configured for svelte
  test: {
    globals: true,
    setupFiles: ['@testing-library/svelte/vitest'],
    name: 'client',
    watch: false,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        {
          browser: 'chromium' as 'webkit' | 'firefox' | 'chromium',
          headless: true,
        },
      ],
    },
    include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
    exclude: ['src/lib/server/**'],
  },
}));
