import type { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { API_ENDPOINTS, handleQueryResponse } from '@dans-coding-world/shared-data-access-api';
import type { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';

export async function load() {
	const response = await api.get<BaseResponse<GetPostsResponseDto>>(API_ENDPOINTS.POSTS.LIST);
	const result = handleQueryResponse(response);
	if (result) return { postsResponse: result };
	else return;
}
