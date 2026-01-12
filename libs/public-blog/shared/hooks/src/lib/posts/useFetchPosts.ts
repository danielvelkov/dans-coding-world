import { useQuery } from '@tanstack/react-query';
import {
  GetPostsResponseDto,
  GetPostsDto,
} from '@dans-coding-world/shared-post-dto';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

export type FetchPostsQueryParams = Omit<GetPostsDto, 'viewerId'>;

export const useFetchPosts = (params?: FetchPostsQueryParams) => {
  const query = useQuery({
    staleTime: TEN_MINUTES_IN_MS,
    queryKey: ['posts', params],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetPostsResponseDto>>(
        API_ENDPOINTS.POSTS.LIST,
        {
          params,
        }
      );

      if (!response) return Promise.reject('An unknown error occurred');
      else if (!response.success) {
        return Promise.reject(response.error);
      }

      return response.data;
    },
  });

  return query;
};
