import { createQuery } from '@tanstack/svelte-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  type ApiError,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import type { ReportDetailExtended } from '@dans-coding-world/report-data-access';

export function createReportQuery(id: number, options?: { enabled?: boolean }) {
  return createQuery<{ report: ReportDetailExtended } | null, ApiError>(() => ({
    queryKey: ['comment_report', id],
    retry: 1,
    queryFn: async () => {
      const response = await api.get<
        BaseResponse<{ report: ReportDetailExtended }>
      >(API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(id));
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
