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
	import Toast from '$lib/shared/Toast.svelte';
	import { PUBLIC_BLOG_URL } from '$lib/shared/constants';

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

	const blogURL = PUBLIC_BLOG_URL;
</script>

<header
	class="sticky top-0 z-50 overflow-hidden border-b border-(--color-border-subtle) bg-(--color-bg-elevated)/80 backdrop-blur-md"
>
	<div
		class="pointer-events-none absolute -top-12 left-1/2 -z-10 h-32 w-2/3 -translate-x-1/2 rounded-full bg-linear-to-r from-(--color-accent-subtle) via-(--color-accent-glow) to-(--color-accent-subtle) opacity-80 blur-2xl"
	></div>
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
			{#if user && (user.role === 'ADMIN' || user.role === 'AUTHOR')}
				<a
					href={resolve('/posts/new')}
					class="transition-colors hover:underline"
					aria-current={page.url.pathname.startsWith('/posts/new')}>Create post</a
				>
			{/if}
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
	<div
		class="absolute right-0 bottom-0 left-0 h-0.5 bg-linear-to-r from-transparent via-(--color-accent-glow) to-transparent opacity-75"
	></div>
</header>

<main class="mx-auto flex w-full max-w-7xl flex-1 flex-col self-center px-4 py-5 sm:px-6 lg:px-8">
	{@render children()}
</main>

<footer class="mt-20">
	<a rel="external" href={blogURL} target="_blank" class="transition-colors hover:underline"
		>Dan's Coding World</a
	>
</footer>

<Toast></Toast>
