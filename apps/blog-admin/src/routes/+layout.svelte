<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.ico';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/shared/query-client';

	const { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<QueryClientProvider client={queryClient}>
	<div class="flex min-h-screen w-full flex-col">
		{@render children()}
	</div>
</QueryClientProvider>
