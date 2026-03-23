import { useQuery } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { handleQueryResponse } from '../helper/handle-query-response';
import { PostFull } from '@dans-coding-world/post-data-access';

export const useFetchPost = (postId: number) => {
  const query = useQuery({
    staleTime: Infinity,
    queryKey: ['post', postId],
    queryFn: async () => {
      const response = await api.get<BaseResponse<{ post: PostFull }>>(
        API_ENDPOINTS.POSTS.BY_ID(postId)
      );
      return handleQueryResponse(response);
    },
    retry: 1,
  });

  return query;
};
