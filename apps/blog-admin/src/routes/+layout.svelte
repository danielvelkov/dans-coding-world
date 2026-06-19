<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';

	interface Props {
		data: {
			queryClient: QueryClient;
		};
		children: Snippet<[]>;
	}

	const { data, children }: Props = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<QueryClientProvider client={data.queryClient}>
	<header class="border-b border-gray-200 bg-white shadow-sm">
		<nav
			class="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4 text-sm font-medium text-gray-700"
		>
			<a href={resolve('/')} class="transition-colors hover:text-gray-900">Home</a>
			<a href={resolve('/posts')} class="transition-colors hover:text-gray-900">Posts</a>
		</nav>
	</header>

	<main class="m-auto flex max-w-2xl flex-col">
		{@render children()}
	</main>
</QueryClientProvider>
