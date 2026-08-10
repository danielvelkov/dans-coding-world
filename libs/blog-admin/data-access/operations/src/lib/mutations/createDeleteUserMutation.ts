import {
  createMutation,
  CreateMutationOptions,
  useQueryClient,
} from '@tanstack/svelte-query';
import {
  DeleteUserDto,
  GetUsersResponseDto,
} from '@dans-coding-world/shared-user-dto';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';

export function createDeleteUserMutation(
  options?: CreateMutationOptions<
    { message: string } | null,
    Error,
    Omit<DeleteUserDto, 'userId'>,
    {
      previousQueries: Array<[readonly unknown[], unknown]>;
    }
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<
    { message: string } | null,
    Error,
    Omit<DeleteUserDto, 'userId'>,
    {
      previousQueries: Array<[readonly unknown[], unknown]>;
    }
  >(() => ({
    mutationFn: async (data) => {
      const response = await api.delete<BaseResponse<{ message: string }>>(
        API_ENDPOINTS.USERS.BY_ID(data.userToDeleteId),
      );
      return handleQueryResponse(response);
    },
    onMutate: async (deleteUserDto) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });

      queryClient.invalidateQueries({
        queryKey: ['user', deleteUserDto.userToDeleteId],
      });
      const previousQueries = queryClient.getQueriesData({
        queryKey: ['users'],
      });

      // Optimistic delete in all users query data
      queryClient.setQueriesData(
        { queryKey: ['users'] },
        (
          oldData: GetUsersResponseDto | undefined,
        ): GetUsersResponseDto | undefined => {
          if (!oldData) return oldData;

          if (Array.isArray(oldData.items) && oldData.items.length > 0) {
            return {
              ...oldData,
              pagination: {
                ...oldData.pagination,
                total: Math.max(0, oldData.pagination.total - 1),
              },
              items: oldData.items.filter(
                (user) => user.id !== deleteUserDto.userToDeleteId,
              ),
            };
          }

          return oldData;
        },
      );

      return { previousQueries };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comment_reports'] });
    },
    onError: (err, deleteUserId, context) => {
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
