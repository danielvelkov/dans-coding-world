import {
  createMutation,
  CreateMutationOptions,
  useQueryClient,
} from '@tanstack/svelte-query';
import {
  DeletePostDto,
  GetPostsResponseDto,
} from '@dans-coding-world/shared-post-dto';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';

export function createDeletePostMutation(
  options?: CreateMutationOptions<
    { message: string } | null,
    Error,
    DeletePostDto,
    {
      previousQueries: Array<[readonly unknown[], unknown]>;
    }
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<
    { message: string } | null,
    Error,
    DeletePostDto,
    {
      previousQueries: Array<[readonly unknown[], unknown]>;
    }
  >(() => ({
    mutationFn: async (data) => {
      const response = await api.delete<BaseResponse<{ message: string }>>(
        API_ENDPOINTS.POSTS.BY_ID(data.postId),
      );
      return handleQueryResponse(response);
    },
    onMutate: async (deletePostDto) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });

      queryClient.invalidateQueries({
        queryKey: ['post', deletePostDto.postId],
      });
      const previousQueries = queryClient.getQueriesData({
        queryKey: ['posts'],
      });

      // Optimistic delete in all posts query data
      queryClient.setQueriesData(
        { queryKey: ['posts'] },
        (
          oldData: GetPostsResponseDto | undefined,
        ): GetPostsResponseDto | undefined => {
          if (!oldData) return oldData;

          if (Array.isArray(oldData.items) && oldData.items.length > 0) {
            return {
              ...oldData,
              pagination: {
                ...oldData.pagination,
                total: Math.max(0, oldData.pagination.total - 1),
              },
              items: oldData.items.filter(
                (post) => post.id !== deletePostDto.postId,
              ),
            };
          }

          return oldData;
        },
      );

      return { previousQueries };
    },

    onError: (err, deletedPostId, context) => {
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
