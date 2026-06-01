<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
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
	<header>
		<nav>
			<a href="/posts">Posts</a>
		</nav>
	</header>
	<main class="m-auto flex max-w-2xl flex-col">
		{@render children()}
	</main>
</QueryClientProvider>
