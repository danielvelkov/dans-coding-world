import {
  createMutation,
  CreateMutationOptions,
  useQueryClient,
} from '@tanstack/svelte-query';
import {
  DeleteCommentDto,
  GetCommentResponseDto,
} from '@dans-coding-world/shared-post-dto';
import { GetReportsResponseDto } from '@dans-coding-world/shared-report-dto';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';

export function createDeleteCommentMutation(
  options?: CreateMutationOptions<
    GetCommentResponseDto | null,
    Error,
    DeleteCommentDto,
    {
      previousQueries: Array<[readonly unknown[], unknown]>;
    }
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<
    GetCommentResponseDto | null,
    Error,
    DeleteCommentDto,
    {
      previousQueries: Array<[readonly unknown[], unknown]>;
    }
  >(() => ({
    mutationFn: async (data) => {
      const response = await api.delete<
        BaseResponse<GetCommentResponseDto | null>
      >(API_ENDPOINTS.COMMENTS.BY_ID(data.postId, data.commentId));
      return handleQueryResponse(response);
    },
    onMutate: async (deleteCommentDto) => {
      const previousQueries = queryClient.getQueriesData({
        queryKey: ['comment_reports'],
      });

      // Optimistic delete in all reports query data as reports are tied to comments
      queryClient.setQueriesData(
        { queryKey: ['comment_reports'] },
        (
          oldData: GetReportsResponseDto | undefined,
        ): GetReportsResponseDto | undefined => {
          if (!oldData) return oldData;

          if (Array.isArray(oldData.items) && oldData.items.length > 0) {
            return {
              ...oldData,
              pagination: {
                ...oldData.pagination,
                total: Math.max(0, oldData.pagination.total - 1),
              },
              items: oldData.items.filter(
                (report) => report.commentId !== deleteCommentDto.commentId,
              ),
            };
          }

          return oldData;
        },
      );

      return { previousQueries };
    },

    onError: (err, _, context) => {
      // Fallback to previous query data on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }
    },
    ...options,
  }));
}
