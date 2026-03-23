import { useInfiniteQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { handleQueryResponse } from '../helper/handle-query-response';
import { FetchPostCommentsQueryParams } from '../types/fetchPostCommentsQueryParams';
import { GetPostCommentsResponseDto } from '@dans-coding-world/shared-post-dto';
import { PAGINATION } from '@dans-coding-world/shared-constants';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export const useFetchPostCommentsInfinite = (
  params: FetchPostCommentsQueryParams
) => {
  const query = useInfiniteQuery({
    staleTime: FIVE_MINUTES_IN_MS,
    queryKey: ['post-comments', params],
    initialPageParam: 0,
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const pageOffset =
        pageParam && pageParam !== 0
          ? (pageParam - 1) *
            (params.pageOffset ?? PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE)
          : params.pageOffset;

      const response = await api.get<BaseResponse<GetPostCommentsResponseDto>>(
        API_ENDPOINTS.COMMENTS.LIST(params.postId),
        {
          params: {
            ...params,
            pageOffset,
          },
        }
      );
      return handleQueryResponse(response);
    },
    getNextPageParam: (lastResponse) => {
      if (lastResponse && lastResponse.pagination.hasNext)
        return lastResponse?.pagination.page + 1;
      else return undefined;
    },
  });

  return query;
};
