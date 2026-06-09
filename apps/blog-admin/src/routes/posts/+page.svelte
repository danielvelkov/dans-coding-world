<script lang="ts">
	import { PostsManager } from '@dans-coding-world/blog-admin-features-posts-manager';
	import type { PostsManagerParams } from '@dans-coding-world/blog-admin-features-posts-manager';

	let params: PostsManagerParams = $state({});
</script>

<svelte:head>
	<title>Your Posts</title>
</svelte:head>

<PostsManager
	{params}
	onParamsChange={(newParams) => {
		params = newParams;
	}}
/>
