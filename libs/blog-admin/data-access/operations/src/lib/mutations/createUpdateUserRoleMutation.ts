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
import {
  ChangeRoleDto,
  GetUsersResponseDto,
} from '@dans-coding-world/shared-user-dto';
import { GetUserResponseDto } from '@dans-coding-world/shared-user-dto';

export function createUpdateUserRoleMutation(
  options?: CreateMutationOptions<
    GetUserResponseDto | null,
    Error,
    ChangeRoleDto
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<GetUserResponseDto | null, Error, ChangeRoleDto>(
    () => ({
      mutationFn: async (data) => {
        const response = await api.patch<BaseResponse<GetUserResponseDto>>(
          API_ENDPOINTS.USERS.ROLE_CHANGE(data.userId),
          { ...data },
        );
        return handleQueryResponse(response);
      },
      onSettled: (dto) => {
        if (dto?.user)
          queryClient.invalidateQueries({
            predicate: (query) => {
              if (!Array.isArray(query.queryKey)) return false;
              if (query.queryKey[0] !== 'users') return false;

              const queryData = query.state.data as GetUsersResponseDto | null;

              if (!queryData || !Array.isArray(queryData.items)) return false;

              return queryData.items.some((u) => u.id === dto.user.id);
            },
          });
      },
      ...options,
    }),
  );
}
