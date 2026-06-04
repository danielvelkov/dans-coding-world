import { createQuery } from '@tanstack/svelte-query';
import type { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { FetchPostsQueryParams } from '../types/fetchPostsQueryParams.js';

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

export function createPostsQuery(
  params?: FetchPostsQueryParams,
  options?: { enabled?: boolean },
) {
  return createQuery<GetPostsResponseDto | null, Error>(() => ({
    staleTime: TEN_MINUTES_IN_MS,
    queryKey: ['posts', params],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetPostsResponseDto>>(
        API_ENDPOINTS.POSTS.LIST,
        {
          params,
        },
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
