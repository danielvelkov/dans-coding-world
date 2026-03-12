import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { BaseResponse } from '@dans-coding-world/api-types';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { generateRandomPosts } from './posts-generator.js';
import { PostFull } from '@dans-coding-world/post-data-access';

export function generateMockPostsResponse({
  length = 5,
  pageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
}: {
  length: number;
  pageSize: number;
}): BaseResponse<GetPostsResponseDto> {
  return {
    error: null,
    success: true,
    data: {
      items: generateRandomPosts(length).slice(0, pageSize),
      pagination: {
        page: 1,
        totalPages: Math.ceil(length / pageSize),
        hasNext: false,
        hasPrev: false,
        limit: pageSize,
        total: length,
      },
      count: length > pageSize ? pageSize : length,
    },
  };
}

export function generateMockPostResponse({
  post,
}: {
  post?: Partial<PostFull>;
}): BaseResponse<{ post: PostFull }> {
  const mockPost = generateRandomPosts(1)[0];
  return {
    error: null,
    success: true,
    data: {
      post: {
        ...mockPost,
        ...post,
      },
    },
  };
}
