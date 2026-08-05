import { GetUsersResponseDto } from '@dans-coding-world/shared-user-dto';
import { createQuery } from '@tanstack/svelte-query';
import { FetchUsersQueryParams } from '../types/fetchUsersQueryParams.js';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';

export function createUsersQuery(
  params?: FetchUsersQueryParams,
  options?: { enabled?: boolean },
) {
  return createQuery<GetUsersResponseDto | null, Error>(() => ({
    queryKey: ['users', params],
    queryFn: async (data) => {
      const response = await api.get<BaseResponse<GetUsersResponseDto>>(
        API_ENDPOINTS.USERS.LIST,
        {
          ...data,
        },
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
