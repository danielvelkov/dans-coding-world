import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { handleQueryResponse } from '../helper/handle-query-response';
import { FetchPostCommentsQueryParams } from '../types/fetchPostCommentsQueryParams';
import { GetPostCommentsResponseDto } from '@dans-coding-world/shared-post-dto';

const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;

export const useFetchPostComments = (
  postId: number,
  params?: FetchPostCommentsQueryParams
) => {
  const query = useQuery({
    staleTime: FIVE_MINUTES_IN_MS,
    queryKey: ['post-comments', postId, params],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetPostCommentsResponseDto>>(
        API_ENDPOINTS.COMMENTS.LIST(postId)
      );
      return handleQueryResponse(response);
    },
  });

  return query;
};
