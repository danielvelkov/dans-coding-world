<script lang="ts">
	import { UserLogin } from '@dans-coding-world/blog-admin-features-user-login';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext } from 'svelte';
	import { AUTH_CONTEXT_KEY, AuthStateManager } from '$lib/shared/auth.svelte';

	const authStateManager = getContext<AuthStateManager>(AUTH_CONTEXT_KEY);
	const onUserLogin = $derived(authStateManager.onUserLogin);
	const user = $derived(authStateManager.user);

	$effect(() => {
		if (!user) return;
		else goto(resolve('/posts'));
	});
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<div class="mt-[10vh] flex-1 justify-self-center">
	<UserLogin
		onLogin={async (user) => {
			onUserLogin(user);
		}}
	/>
</div>
