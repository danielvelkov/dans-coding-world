import { GetUsersResponseDto } from '@dans-coding-world/shared-user-dto';
import {
  createInfiniteQuery,
  CreateInfiniteQueryOptions,
  InfiniteData,
} from '@tanstack/svelte-query';
import { FetchUsersQueryParams } from '../types/fetchUsersQueryParams.js';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';

export function createUsersQueryInfinite(
  params?: FetchUsersQueryParams,
  options?: Partial<
    CreateInfiniteQueryOptions<
      GetUsersResponseDto | null,
      Error,
      InfiniteData<GetUsersResponseDto | null, unknown>
    >
  >,
) {
  return createInfiniteQuery<GetUsersResponseDto | null, Error>(() => ({
    initialPageParam: 0,
    queryKey: ['users', params],
    queryFn: async ({ pageParam }) => {
      const pageOffset =
        pageParam && pageParam !== 0
          ? (Number(pageParam) - 1) *
            (params?.pageOffset ?? PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE)
          : params?.pageOffset;
      const response = await api.get<BaseResponse<GetUsersResponseDto>>(
        API_ENDPOINTS.USERS.LIST,
        {
          params: {
            ...params,
            pageOffset,
          },
        },
      );
      return handleQueryResponse(response);
    },
    getNextPageParam: (lastResponse) => {
      if (lastResponse && lastResponse.pagination.hasNext)
        return lastResponse?.pagination.page + 1;
      else return undefined;
    },
    ...options,
  }));
}
