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
	import { fade, slide } from 'svelte/transition';

	const authStateManager = new AuthStateManager();
	authStateManager.init();
	setAuth(authStateManager);

	const { children } = $props();

	const isAuthenticated = $derived(authStateManager.isAuthenticated);
	const isLoading = $derived(authStateManager.isLoading);
	const authBootstrapPending = $derived(authStateManager.authBootstrapPending);
	const user = $derived(authStateManager.user);
	const logout = $derived(authStateManager.logout);

	const blogURL = PUBLIC_BLOG_URL;

	let isMobileMenuOpen = $state(false);

	function closeMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}
</script>

<header
	class="sticky top-0 z-40 w-full border-b border-(--color-border-subtle) bg-(--color-bg-elevated)/80 backdrop-blur-md"
>
	<div
		class="pointer-events-none absolute -top-12 left-1/2 -z-10 h-32 w-2/3 -translate-x-1/2 rounded-full bg-linear-to-r from-(--color-accent-subtle) via-(--color-accent-glow) to-(--color-accent-subtle) opacity-80 blur-2xl"
	></div>

	<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
		<div class="flex w-full items-center justify-between gap-8">
			<div
				class="inline-flex flex-col rounded-md border border-(--color-border-subtle) bg-(--color-bg-surface) px-2 py-1 shadow-xs"
			>
				<a href={resolve('/')} class="hover:opacity-90">
					<div
						class="font-(family-name:--font-bangers) text-sm leading-snug tracking-wider text-(--color-text-primary)"
					>
						Dan's Coding World
					</div>
					<hr />
					<div
						class="text-center text-xs font-semibold tracking-wider text-(--color-text-tertiary) uppercase"
					>
						Dashboard
					</div>
				</a>
			</div>

			<!-- Desktop Navigation -->
			<nav class="hidden items-center gap-6 text-sm font-medium md:flex">
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

					{#if user && (user.role === 'MOD' || user.role === 'ADMIN')}
						<a
							href={resolve('/reports/comments')}
							class="transition-colors hover:underline"
							aria-current={page.url.pathname.startsWith('/reports/comments')}>Reports</a
						>
					{/if}

					{#if user && user.role === 'ADMIN'}
						<a
							href={resolve('/users')}
							class="transition-colors hover:underline"
							aria-current={page.url.pathname.startsWith('/users')}>Users</a
						>
					{/if}

					<span aria-label="Account name" class="font-semibold">{user?.email}</span>
					<UserRoleBadge role={user?.role}></UserRoleBadge>
				{/if}

				<div class="hidden items-center gap-4 md:flex">
					{#if !authBootstrapPending && isAuthenticated && user}
						<button
							role="link"
							disabled={isLoading}
							onclick={async () => {
								logout();

								await goto(resolve('/(app)/(public)/login'));
							}}
							class=" m-0 cursor-pointer border-none p-0 transition-colors hover:underline"
						>
							{#if isLoading}
								<SpinnerLoader></SpinnerLoader>
							{:else}
								Logout
							{/if}
						</button>
					{:else}
						<a
							href={resolve('/(app)/(public)/login')}
							data-testid="login-link"
							class="font-medium transition-colors hover:underline"
						>
							Login</a
						>
					{/if}

					<ThemeToggleButton></ThemeToggleButton>
				</div>
			</nav>
		</div>

		<!-- Mobile Menu Toggle Button -->
		<div class="flex items-center gap-2 md:hidden">
			<button
				onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
				class="rounded-md p-2 text-(--color-text-secondary) hover:text-(--color-text-primary) focus:outline-hidden"
				aria-label="Toggle Navigation Menu"
			>
				<i class={`fa ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
			</button>
		</div>
	</div>

	<div
		class="h-0.5 bg-linear-to-r from-transparent via-(--color-accent-glow) to-transparent opacity-75"
	></div>
</header>

{#if isMobileMenuOpen}
	<!-- Backdrop -->
	<button
		transition:fade={{ duration: 150 }}
		onclick={closeMobileMenu}
		class="fixed inset-0 z-50 cursor-default border-none bg-black/50 p-0 backdrop-blur-xs md:hidden"
		aria-label="Close navigation"
	></button>

	<!-- Sidebar Panel -->
	<aside
		transition:slide={{ duration: 200 }}
		class="fixed inset-y-0 right-0 z-50 flex w-64 flex-col justify-between border-l border-(--color-border-subtle) bg-(--color-bg-elevated) p-6 shadow-xl md:hidden"
	>
		<div class="space-y-6">
			<div class="flex items-center justify-between border-b border-(--color-border-subtle) pb-4">
				<span class="text-sm font-bold text-(--color-text-primary)">Navigation</span>
				<button
					onclick={closeMobileMenu}
					class="text-(--color-text-tertiary) hover:text-(--color-text-primary)"
					aria-label="Close menu"
				>
					<i class="fa fa-times text-base"></i>
				</button>
			</div>

			<nav class="flex flex-col gap-3 text-sm font-medium">
				<a
					href={resolve('/')}
					onclick={closeMobileMenu}
					class="rounded-md px-3 py-2 transition-colors hover:bg-(--color-bg-surface-hover) hover:underline"
				>
					Home
				</a>
				{#if isAuthenticated}
					<a
						href={resolve('/posts')}
						class="rounded-md px-3 py-2 transition-colors hover:bg-(--color-bg-surface-hover) hover:underline"
						aria-current={page.url.pathname.startsWith('/posts')}>Posts</a
					>

					{#if user && (user.role === 'ADMIN' || user.role === 'AUTHOR')}
						<a
							href={resolve('/posts/new')}
							class="rounded-md px-3 py-2 transition-colors hover:bg-(--color-bg-surface-hover) hover:underline"
							aria-current={page.url.pathname.startsWith('/posts/new')}>Create post</a
						>
					{/if}

					{#if user && (user.role === 'MOD' || user.role === 'ADMIN')}
						<a
							href={resolve('/reports/comments')}
							class="rounded-md px-3 py-2 transition-colors hover:bg-(--color-bg-surface-hover) hover:underline"
							aria-current={page.url.pathname.startsWith('/reports/comments')}>Reports</a
						>
					{/if}

					{#if user && user.role === 'ADMIN'}
						<a
							href={resolve('/users')}
							class="rounded-md px-3 py-2 transition-colors hover:bg-(--color-bg-surface-hover) hover:underline"
							aria-current={page.url.pathname.startsWith('/users')}>Users</a
						>
					{/if}
				{/if}
			</nav>
		</div>

		<!-- Mobile User Action Footer -->
		<div class="space-y-3 border-t border-(--color-border-subtle) pt-4">
			{#if isAuthenticated && user}
				<div class="flex flex-col gap-1">
					<span class="text-xs text-(--color-text-tertiary)">Signed in as</span>
					<span class="truncate text-xs font-semibold text-(--color-text-primary)"
						>{user.email}</span
					>
					<div class="mt-1">
						<UserRoleBadge role={user.role}></UserRoleBadge>
					</div>
				</div>

				<button
					disabled={isLoading}
					onclick={async () => {
						closeMobileMenu();
						logout();
						await goto(resolve('/login'));
					}}
					class="w-full rounded-md px-3 py-2 text-left text-xs font-medium text-(--color-error) transition-colors hover:bg-(--color-error-bg)"
				>
					{#if isLoading}
						<SpinnerLoader></SpinnerLoader>
					{:else}
						Logout
					{/if}
				</button>
			{:else if !authBootstrapPending}
				<a
					data-testid="login-link"
					href={resolve('/login')}
					onclick={closeMobileMenu}
					class="block w-full rounded-md bg-(--color-accent-subtle) px-3 py-2 text-center text-sm font-medium text-(--color-accent)"
				>
					Login
				</a>
			{/if}
		</div>
	</aside>
{/if}

<main class="mx-auto flex w-full max-w-7xl flex-1 flex-col self-center px-4 py-6 sm:px-6 lg:px-8">
	{@render children()}
</main>

<footer
	class="mt-auto border-t border-(--color-border-subtle) bg-(--color-bg-elevated)/40 py-6 text-xs text-(--color-text-secondary)"
>
	<div
		class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6"
	>
		<div class="flex items-center gap-4">
			<span>
				made by
				<a
					class="text-(--color-link) hover:text-(--color-link-hover) hover:underline"
					href="https://dv-project-portfolio.netlify.app/#contact">me</a
				>
			</span>
			<div>
				<a aria-label="Author Github page" href="https://github.com/danielvelkov">
					<i class="fa fa-github"></i>
				</a>
			</div>
		</div>
		<div class="flex items-center gap-4">
			<a
				rel="external"
				href={blogURL}
				target="_blank"
				class="inline-flex items-center gap-1.5 text-(--color-link) transition-colors hover:text-(--color-link-hover) hover:underline"
			>
				<span>View Public Blog</span>
				<i class="fa fa-external-link text-[10px]"></i>
			</a>
		</div>
	</div>
</footer>

<Toast></Toast>
