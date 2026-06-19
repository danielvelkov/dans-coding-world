import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';
import baseConfig from '../../eslint.config.mjs';

export default [
	{
		ignores: [
			'.svelte-kit/**',
			'node_modules/**',
			'dist/**',
			'build/**',
			'.vscode/**',
			'**/*.json',
			'eslint.config.mjs',
			'svelte.config.js'
		]
	},
	...baseConfig,
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		files: ['src/**/*.{ts,tsx,js,jsx}', 'vite.config.ts'],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				projectService: true
			}
		},
		rules: {
			'no-undef': 'off'
		}
	},
	{
		files: ['src/**/*.svelte', 'src/**/*.svelte.ts', 'src/**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		},
		rules: {
			'no-undef': 'off'
		}
	},
	{
		rules: {
			'@nx/enforce-module-boundaries': [
				'error',
				{
					enforceBuildableLibDependency: false
				}
			]
		}
	}
];
