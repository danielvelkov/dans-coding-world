import { GetPostsResponseDto } from '@dans-coding-world/shared-post-dto';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { generateRandomPosts } from './posts-generator.js';

export function generateMockPostsResponse({
  length = 5,
  pageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
}: {
  length: number;
  pageSize: number;
}): GetPostsResponseDto {
  return {
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
  };
}
