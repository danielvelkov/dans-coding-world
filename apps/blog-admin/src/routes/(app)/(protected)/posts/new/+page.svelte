<script lang="ts">
	import { CreatePost } from '@dans-coding-world/blog-admin-features-posts-editor';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from '$lib/shared/toast.svelte';
</script>

<svelte:head>
	<title>Create a new post</title>
</svelte:head>

<CreatePost
	onPostCreated={(createdPost) => {
		goto(resolve(`/(app)/(protected)/posts/${createdPost.id}/edit`)).then(() => {
			toast.success('Post created successfully');
		});
	}}
></CreatePost>
