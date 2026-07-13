<script lang="ts">
	import { resolve } from '$app/paths';
	import { AuthStateManager, setAuth } from '$lib/shared/auth.svelte';
	import {
		DotsLoader,
		SpinnerLoader,
		UserRoleBadge
	} from '@dans-coding-world/blog-admin-ui-common';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ThemeToggleButton from '$lib/shared/ThemeToggleButton.svelte';

	const authStateManager = new AuthStateManager();
	authStateManager.init();
	setAuth(authStateManager);

	const { children } = $props();
	// don't do this as it might actually give you a one-time snapshot
	// const { isAuthenticated, user, logout, isLoading } = $derived(authStateManager);

	const isAuthenticated = $derived(authStateManager.isAuthenticated);
	const isLoading = $derived(authStateManager.isLoading);
	const authBootstrapPending = $derived(authStateManager.authBootstrapPending);
	const user = $derived(authStateManager.user);
	const logout = $derived(authStateManager.logout);
</script>

<header class="border-b">
	<nav
		class="mx-auto flex w-fit max-w-7xl flex-wrap items-center gap-6 px-6 py-4 text-sm font-medium sm:w-auto"
	>
		<a
			href={resolve('/')}
			class="transition-colors hover:underline"
			aria-current={page.url.pathname === '/'}>Home</a
		>
		{#if authBootstrapPending}
			<DotsLoader loadingMessage="Checking your session…"></DotsLoader>
		{:else if isAuthenticated}
			<a
				href={resolve('/posts')}
				class="transition-colors hover:underline"
				aria-current={page.url.pathname.startsWith('/posts')}>Posts</a
			>
			<button
				role="link"
				disabled={isLoading}
				onclick={async () => {
					logout();
					await goto(resolve('/login'));
				}}
				class=" m-0 border-none p-0 transition-colors hover:underline"
			>
				{#if isLoading}
					<SpinnerLoader></SpinnerLoader>
				{:else}
					Logout
				{/if}
			</button>
			<span aria-label="Account name" class="font-semibold">{user?.email}</span>
			<UserRoleBadge role={user?.role}></UserRoleBadge>
		{:else}
			<a href={resolve('/login')} class="transition-colors hover:underline">Login</a>
		{/if}
		<ThemeToggleButton></ThemeToggleButton>
	</nav>
</header>

<main class="mx-auto flex w-full max-w-7xl flex-1 flex-col self-center px-4 py-5 sm:px-6 lg:px-8">
	{@render children()}
</main>
