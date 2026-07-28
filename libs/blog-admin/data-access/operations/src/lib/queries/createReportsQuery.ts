import { createQuery } from '@tanstack/svelte-query';
import type {
  GetReportsDto,
  GetReportsResponseDto,
} from '@dans-coding-world/shared-report-dto';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';

export function createReportsQuery(
  params?: GetReportsDto,
  options?: { enabled?: boolean },
) {
  return createQuery<GetReportsResponseDto | null, Error>(() => ({
    queryKey: ['comment_reports', params],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetReportsResponseDto>>(
        API_ENDPOINTS.REPORTS.COMMENTS.LIST,
        {
          params,
        },
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
