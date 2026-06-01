import type { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { API_ENDPOINTS, handleQueryResponse } from '@dans-coding-world/shared-data-access-api';
import type { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import type { QueryClient } from '@tanstack/svelte-query';

// old way- you need to pass result to initialData prop everywhere, not cached in query client
// export async function load() {
// 	const response = await api.get<BaseResponse<GetPostsResponseDto>>(API_ENDPOINTS.POSTS.LIST);
// 	const result = handleQueryResponse(response);
// 	if (result) return { postsResponse: result };
// 	else return;
// }

export async function load({ parent }) {
	const result: { queryClient: QueryClient } = await parent();
	const { queryClient } = result;
	await queryClient.prefetchQuery<GetPostsResponseDto | null, Error>({
		queryKey: ['posts'],
		queryFn: async () => {
			const response = await api.get<BaseResponse<GetPostsResponseDto>>(API_ENDPOINTS.POSTS.LIST);
			return handleQueryResponse(response);
		}
	});
}
