<script lang="ts">
	import { onMount } from 'svelte';

	let dark = $state(false);

	onMount(() => {
		const stored = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		dark = stored === 'dark' || (!stored && prefersDark);

		document.documentElement.classList.toggle('dark', dark);
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		document.documentElement.classList.toggle('light', !dark);
		localStorage.setItem('theme', dark ? 'dark' : 'light');
	}
</script>

<button onclick={toggle} class="rounded-lg p-2 transition-colors" aria-label="Toggle dark mode">
	{#if dark}
		<i class="fas fa-sun"></i>
	{:else}
		<i class="fas fa-moon"></i>
	{/if}
</button>
