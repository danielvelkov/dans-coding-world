<script lang="ts">
	import type { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
	import { api } from '@dans-coding-world/public-blog-data-access-api';
	import type { BaseResponse } from '@dans-coding-world/api-types';
	import { PostsTable } from '@dans-coding-world/blog-admin-features-posts-table';
	import { API_ENDPOINTS, handleQueryResponse } from '@dans-coding-world/shared-data-access-api';
	import { createQuery } from '@tanstack/svelte-query';

	const { data } = $props();

	const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
	const postsQuery = createQuery<GetPostsResponseDto | null, Error>(() => ({
		staleTime: TEN_MINUTES_IN_MS,
		queryKey: ['posts'],
		queryFn: async () => {
			const response = await api.get<BaseResponse<GetPostsResponseDto>>(API_ENDPOINTS.POSTS.LIST);
			return handleQueryResponse(response);
		},
		initialData: data.postsResponse
	}));
</script>

<svelte:head>
	<title>Your Posts</title>
</svelte:head>

<h2 class="mb-2 text-4xl">Posts</h2>
{#if postsQuery.status === 'pending'}
	<span>Loading...</span>
{:else if postsQuery.status === 'error'}
	<span>Error: {postsQuery.error.message}</span>
{:else}
	<PostsTable posts={postsQuery.data?.items}></PostsTable>
{/if}
