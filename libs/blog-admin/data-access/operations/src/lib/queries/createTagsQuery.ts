import { createQuery } from '@tanstack/svelte-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { GetTagsResponse } from '@dans-coding-world/shared-post-dto';

export function createTagsQuery(options?: { enabled?: boolean }) {
  return createQuery<GetTagsResponse | null, Error>(() => ({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetTagsResponse>>(
        API_ENDPOINTS.TAGS.LIST,
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
