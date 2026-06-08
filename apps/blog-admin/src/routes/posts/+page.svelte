<script lang="ts">
	import { PostsTable } from '@dans-coding-world/blog-admin-features-posts-manager';
	import { createPostsQuery } from '@dans-coding-world/blog-admin-data-access-operations';

	const postsQuery = createPostsQuery();
	const isLoading = $derived(postsQuery.isLoading);
	const posts = $derived(postsQuery.data?.items ?? []);
	const error = $derived(postsQuery.error);
</script>

<svelte:head>
	<title>Your Posts</title>
</svelte:head>

<h2 class="mb-2 text-4xl">Posts</h2>
<PostsTable {posts} {isLoading} error={error ?? undefined}></PostsTable>
