<script lang="ts">
	import { CreatePost } from '@dans-coding-world/blog-admin-features-posts-editor';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from '$lib/shared/toast.svelte';
	import { getAuth } from '$lib/shared/auth.svelte';
	import { Forbidden } from '@dans-coding-world/blog-admin-ui-errors';

	const authStateManager = getAuth();
	const user = $derived(authStateManager.user);
	const canCreatePost = $derived(user && (user.role === 'ADMIN' || user.role === 'AUTHOR'));
</script>

<svelte:head>
	<title>Create a new post</title>
</svelte:head>

{#if !canCreatePost}
	<Forbidden message="Access Denied"></Forbidden>
{:else}
	<CreatePost
		onPostCreated={(createdPost) => {
			goto(resolve(`/(app)/(protected)/posts/${createdPost.id}/edit`)).then(() => {
				toast.success('Post created successfully');
			});
		}}
	></CreatePost>
{/if}
