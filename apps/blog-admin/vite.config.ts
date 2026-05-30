/// <reference types='vitest/config' />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	ssr: {
		noExternal: ['@tanstack/svelte-query']
	},
	server: {
		port: 5173,
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
});
