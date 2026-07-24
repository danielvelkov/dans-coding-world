<script lang="ts">
	import { getAuth } from '$lib/shared/auth.svelte';
	import { Forbidden, Unauthorized } from '@dans-coding-world/blog-admin-ui-errors';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Button } from '@dans-coding-world/blog-admin-ui-common';

	const auth = getAuth();
	const { children } = $props();

	const user = $derived(auth.user);
	const logout = $derived(auth.logout);
	const isAuthenticated = $derived(auth.isAuthenticated);
	const authBootstrapPending = $derived(auth.authBootstrapPending);

	const isForbidden = $derived.by(() => user && user.role === 'USER');
	const isBanned = $derived.by(() => user && user.isBanned);
	const isUnauthorized = $derived.by(() => !isAuthenticated && !isForbidden);

	$effect(() => {
		let logoutTimer: NodeJS.Timeout | null = null;
		if (isForbidden || isBanned) {
			logoutTimer = setTimeout(() => {
				logout();
				goto(resolve('/'));
			}, 10000);
		}
		return () => {
			if (logoutTimer) clearTimeout(logoutTimer);
		};
	});
</script>

{#if authBootstrapPending}
	<!-- Render nothing while session restore is running -->
{:else if isBanned}
	<div class="cube-wrap">
		<div
			class="cube-crawl mx-auto mt-[10%] flex max-w-md flex-col items-center justify-center gap-4
			rounded-2xl border border-(--color-border-subtle) bg-(--color-bg-surface-hover)
			p-6 text-center"
		>
			<h2 class="font-medium text-(--color-text-primary)">You have been banned.</h2>
			<p class="mb-2 w-75 text-sm text-balance whitespace-pre-line text-(--color-text-secondary)">
				{`Please submit an unban request to one of our mods.\n\n You will be
				automatically signed out shortly...`}
			</p>

			<Button
				class="w-full  bg-(--color-accent) font-semibold 
				 shadow-(--color-focus-ring) transition-colors sm:w-auto"
				role="link"
				onclick={async () => {
					logout();
					await goto(resolve('/'));
				}}
			>
				Log Out Now
			</Button>
		</div>
	</div>
{:else if isForbidden}
	<Forbidden message="Access Denied">
		<div
			class="mx-auto mt-6 flex max-w-md flex-col items-center justify-center gap-4
			rounded-2xl border border-(--color-border-subtle) bg-(--color-bg-surface-hover)
			p-6 text-center"
		>
			<p class="text-base font-medium text-(--color-text-primary)">
				Your account does not have creator or moderator privileges.
			</p>
			<p class="mb-2 w-75 text-sm text-balance whitespace-pre-line text-(--color-text-secondary)">
				{`Please submit a request via the homepage if you would like to join the crew.\n\n You will be
				automatically signed out shortly...`}
			</p>

			<Button
				class="w-full  bg-(--color-accent) font-semibold 
				 shadow-(--color-focus-ring) transition-colors sm:w-auto"
				role="link"
				onclick={async () => {
					logout();
					await goto(resolve('/'));
				}}
			>
				Log Out Now
			</Button>
		</div>
	</Forbidden>
{:else if isUnauthorized}
	<Unauthorized message="Authentication Required">
		<div class="mx-auto mt-2 flex max-w-md flex-col items-center justify-center p-6 text-center">
			<p class="mb-6 text-sm text-(--color-text-secondary)">
				You must be logged in to view this page.
			</p>
			<Button
				class="font-semibold sm:w-auto"
				role="link"
				onclick={async () => await goto(resolve('/login'))}
			>
				Return to Login
			</Button>
		</div>
	</Unauthorized>
{:else}
	{@render children()}
{/if}

<style>
	.cube-wrap {
		perspective: 600px;
		perspective-origin: 50% 100%;
		overflow: hidden;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.cube-crawl {
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		line-height: 1.6;
		transform-origin: 50% 100%;
		transform: rotateX(25deg);
		animation: crawl 15s linear forwards;
	}

	.cube-crawl p {
		white-space: pre-line;
		font-size: 0.9rem;
	}

	@keyframes crawl {
		0% {
			transform: rotateX(25deg) translateY(100%);
		}
		100% {
			transform: rotateX(25deg) translateY(-12%);
		}
	}
</style>
