import { useQuery } from '@tanstack/react-query';
import {
  GetPostsResponseDto,
  GetPostsDto,
} from '@dans-coding-world/shared-post-dto';
import { BlogPostItem } from '../types/post-item-data.types';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';

const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

export type FetchPostsQueryParams = Omit<GetPostsDto, 'viewerId'>;

export const useFetchPosts = (params?: FetchPostsQueryParams) => {
  const query = useQuery({
    staleTime: TEN_MINUTES_IN_MS,
    queryKey: ['posts', params],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.POSTS.LIST, {
        params,
      });

      if (!response) return Promise.reject('An unknown error occurred');
      else if (!response.success) {
        return Promise.reject(response.error);
      }

      return extractPaginationAndPosts(response.data as GetPostsResponseDto);
    },
  });

  return query;
};

const extractPaginationAndPosts = (responseDto: GetPostsResponseDto) => {
  const postItemData: BlogPostItem[] = [];

  for (const post of responseDto.items)
    postItemData.push({
      ...post,
      publishedAt: new Date(post.publishedAt as Date),
      updatedAt: new Date(post.updatedAt as Date),
    });

  return { pagination: responseDto.pagination, posts: postItemData };
};
