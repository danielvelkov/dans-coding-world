import { useQuery } from '@tanstack/react-query';
import {
  GetPostsResponseDto,
  GetPostsDto,
} from '@dans-coding-world/shared-post-dto';
import { BlogPostItem } from '../types/post-item-data.types';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';

export type FetchPostsQueryParams = Omit<GetPostsDto, 'viewerId'>;

export const useFetchPosts = (params?: FetchPostsQueryParams) => {
  const query = useQuery({
    queryKey: ['posts', params],
    queryFn: async () => {
      const response = await api.get(API_ENDPOINTS.POSTS.LIST, {
        params,
      });

      if (!response) return Promise.reject('An unknown error occurred');

      if (!response.success) {
        return Promise.reject(response.error);
      }

      return extractPaginationAndPosts(response.data as GetPostsResponseDto);
    },
  });

  return query;
};

// TODO: include author details to GET /posts
const extractPaginationAndPosts = (responseDto: GetPostsResponseDto) => {
  const postItemData: BlogPostItem[] = [];
  for (const post of responseDto.items)
    postItemData.push({
      ...post,
      publishedAt: post.publishedAt as Date,
      author: {
        id: post.authorId,
        role: 'AUTHOR',
        username: 'bababui',
        profile: {
          firstName: 'baba',
          lastName: 'bui',
          avatarURL: 'URL',
        },
      },
    });
  return { pagination: responseDto.pagination, posts: postItemData };
};
