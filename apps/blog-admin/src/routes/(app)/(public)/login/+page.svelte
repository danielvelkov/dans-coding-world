<script lang="ts">
	import { UserLogin } from '@dans-coding-world/blog-admin-features-user-login';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getAuth } from '$lib/shared/auth.svelte';

	const authStateManager = getAuth();
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

<div class="mt-[10vh] flex-1 self-center">
	<UserLogin
		onLogin={async (user) => {
			onUserLogin(user);
		}}
	/>
</div>
