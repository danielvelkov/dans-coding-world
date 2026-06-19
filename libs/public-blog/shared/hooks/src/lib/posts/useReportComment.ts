import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation } from '@tanstack/react-query';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import {
  CreateReportDto,
  GetReportResponseDto,
} from '@dans-coding-world/shared-report-dto';

export function useReportComment() {
  const reportComment = useMutation({
    mutationFn: async (data: Omit<CreateReportDto, 'reporterId'>) => {
      const response = await api.post<BaseResponse<GetReportResponseDto>>(
        API_ENDPOINTS.REPORTS.COMMENTS.LIST,
        data,
      );
      return handleQueryResponse(response);
    },
  });

  return {
    reportComment: reportComment.mutate,
    isSubmitting: reportComment.isPending,
    error: reportComment.error,
    isSuccess: reportComment.isSuccess,
    reset: reportComment.reset,
  };
}
