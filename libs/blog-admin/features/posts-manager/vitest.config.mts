import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const adminBlogPort = env.VITE_ADMIN_BLOG_PORT;
  const publicBlogHost = env.VITE_PUBLIC_BLOG_HOST;
  const publicBlogPort = env.VITE_PUBLIC_BLOG_PORT;

  if (!adminBlogPort || !publicBlogHost || !publicBlogPort)
    throw new Error(`Missing env variables`);

  return {
    plugins: [svelte()],
    root: __dirname,
    cacheDir:
      '../../../../node_modules/.vite/libs/blog-admin/features/posts-manager',
    define: {
      __PUBLIC_BLOG_URL__: JSON.stringify(
        `http://${publicBlogHost}:${publicBlogPort}`,
      ),
    },
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
  };
});
