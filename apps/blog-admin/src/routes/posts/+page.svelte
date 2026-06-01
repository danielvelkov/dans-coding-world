<script lang="ts">
	import type { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
	import { api } from '@dans-coding-world/public-blog-data-access-api';
	import type { BaseResponse } from '@dans-coding-world/api-types';
	import { PostsTable } from '@dans-coding-world/blog-admin-features-posts-table';
	import { API_ENDPOINTS, handleQueryResponse } from '@dans-coding-world/shared-data-access-api';
	import { createQuery } from '@tanstack/svelte-query';

	const TEN_MINUTES_IN_MS = 10 * 60 * 1000;
	// old way: you fetch normally using a load function and pass the data to `initialData` prop

	// Pros: simpler
	// Cons: you need to prop drill that data in components who are at deeper levels

	// const { data } = $props();
	// const postsQuery = createQuery<GetPostsResponseDto | null, Error>(() => ({
	// 	staleTime: TEN_MINUTES_IN_MS,
	// 	queryKey: ['posts'],
	// 	queryFn: async () => {
	// 		const response = await api.get<BaseResponse<GetPostsResponseDto>>(API_ENDPOINTS.POSTS.LIST);
	// 		return handleQueryResponse(response);
	// 	},
	// 	initialData: data.postsResponse // <-- data from load function in page.server.ts
	// }));

	// new way: Svelte Query supports prefetching queries on the server.

	// Pros: data is cached already in the prefetch, meaning there's no need to execute query client side
	// Cons: you cant use it inside +page.server.ts/+layout.server.ts load functions

	// 	Using this setup below, you can fetch data and pass it into QueryClientProvider,
	// before it is sent to the user's browser.
	//  Therefore, this data is already available in the cache,
	// and no initial fetch occurs client-side !!!!
	const postsQuery = createQuery<GetPostsResponseDto | null, Error>(() => ({
		staleTime: TEN_MINUTES_IN_MS,
		queryKey: ['posts'],
		queryFn: async () => {
			const response = await api.get<BaseResponse<GetPostsResponseDto>>(API_ENDPOINTS.POSTS.LIST);
			return handleQueryResponse(response);
		}
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
