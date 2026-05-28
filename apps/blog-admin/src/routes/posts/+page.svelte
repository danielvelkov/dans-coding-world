<script lang="ts">
	import { PostsTable } from '@dans-coding-world/blog-admin-features-posts-table';
	import { generateMockPostsResponse } from '@dans-coding-world/shared-post-testing';
	import { PAGINATION } from '@dans-coding-world/shared-constants';
	const { data } = generateMockPostsResponse({
		length: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
		pageSize: PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
	});
	const posts = data?.items;
	if (!posts) throw new Error('Missing fixtures');
</script>

<h2>Posts</h2>
<PostsTable {posts}></PostsTable>
