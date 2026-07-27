import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const adminBlogPort = env.VITE_ADMIN_BLOG_PORT;
	const publicBlogHost = env.VITE_PUBLIC_BLOG_HOST;
	const publicBlogPort = env.VITE_PUBLIC_BLOG_PORT;
	if (!adminBlogPort || !publicBlogHost || !publicBlogPort)
		throw new Error(`Missing env variables`);

	return {
		plugins: [tailwindcss(), sveltekit()],
		define: {
			// You need to stringify because because define doesn't accept arbitrary strings
			__PUBLIC_BLOG_URL__: JSON.stringify(`http://${publicBlogHost}:${publicBlogPort}`)
		},
		ssr: {
			noExternal: ['@tanstack/svelte-query']
		},
		server: {
			port: +adminBlogPort,
			strictPort: true
		},
		preview: {
			port: 4173,
			strictPort: false
		},
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						globals: true,
						setupFiles: ['@testing-library/svelte/vitest'],
						name: 'client',
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium', headless: true }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**']
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
