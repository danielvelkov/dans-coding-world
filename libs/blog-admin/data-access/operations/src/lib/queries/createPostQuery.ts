import { createQuery } from '@tanstack/svelte-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  type ApiError,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import type { PostFull } from '@dans-coding-world/post-data-access';

export function createPostQuery(id: number, options?: { enabled?: boolean }) {
  return createQuery<{ post: PostFull } | null, ApiError>(() => ({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await api.get<BaseResponse<{ post: PostFull }>>(
        API_ENDPOINTS.POSTS.BY_ID(id),
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
