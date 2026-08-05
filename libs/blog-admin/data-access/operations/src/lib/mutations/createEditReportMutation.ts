import {
  createMutation,
  useQueryClient,
  type CreateMutationOptions,
} from '@tanstack/svelte-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import type { ReportDetail } from '@dans-coding-world/report-data-access';
import {
  GetReportsResponseDto,
  UpdateReportDto,
} from '@dans-coding-world/shared-report-dto';

export function createEditReportMutation(
  id: number,
  options?: CreateMutationOptions<
    { report: ReportDetail } | null,
    Error,
    Omit<UpdateReportDto, 'reportId' | 'moderatorId'>
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<
    { report: ReportDetail } | null,
    Error,
    Omit<UpdateReportDto, 'reportId' | 'moderatorId'>
  >(() => ({
    mutationFn: async (data) => {
      const response = await api.patch<BaseResponse<{ report: ReportDetail }>>(
        API_ENDPOINTS.REPORTS.COMMENTS.BY_ID(id),
        { ...data },
      );
      return handleQueryResponse(response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comment_report', id] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          if (query.queryKey[0] !== 'comment_reports') return false;

          const data = query.state.data as GetReportsResponseDto | null;

          if (!data || !Array.isArray(data.items)) return false;

          return data.items.some((report) => report.id === id);
        },
      });
    },
    ...options,
  }));
}
