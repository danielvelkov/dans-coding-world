<script lang="ts">
	import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
	import { PAGINATION } from '@dans-coding-world/shared-constants';
	import { PostsTable } from '$lib';
	const { data } = generateMockPostsResponse({
		length: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
		pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
	});
	const posts = data?.items;
	if (!posts) throw new Error('Missing fixtures');
</script>

<h2 class="mb-2 text-4xl">Posts</h2>
<PostsTable {posts}></PostsTable>
