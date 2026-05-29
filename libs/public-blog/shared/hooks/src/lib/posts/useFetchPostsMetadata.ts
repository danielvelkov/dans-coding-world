import { useQuery } from '@tanstack/react-query';
import { GetPostsMetadataResponse } from '@dans-coding-world/shared-post-dto';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

export const useFetchPostsMetadata = () => {
  const query = useQuery({
    staleTime: THIRTY_MINUTES_IN_MS,
    queryKey: ['posts-metadata'],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetPostsMetadataResponse>>(
        API_ENDPOINTS.POSTS.METADATA,
      );
      return handleQueryResponse(response);
    },
  });

  return query;
};
