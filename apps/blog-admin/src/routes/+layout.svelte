<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/shared/query-client';

	const { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<QueryClientProvider client={queryClient}>
	<div class="flex min-h-screen min-w-screen flex-col align-middle">
		{@render children()}
	</div>
</QueryClientProvider>
