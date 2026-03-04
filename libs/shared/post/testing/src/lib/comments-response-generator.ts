import { GetPostCommentsResponseDto } from '@dans-coding-world/shared-post-dto';
import { BaseResponse } from '@dans-coding-world/api-types';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { generateCommentThreads } from './comments-generator.js';

export function generateMockPostCommentsResponse({
  postId = 1,
  length = 5,
  pageSize = PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
  depth = 0,
}: {
  postId: number;
  length: number;
  pageSize: number;
  depth: number;
}): BaseResponse<GetPostCommentsResponseDto> {
  return {
    error: null,
    success: true,
    data: {
      items: generateCommentThreads(postId, length, depth).slice(0, pageSize),
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
