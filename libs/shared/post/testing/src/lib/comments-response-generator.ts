import { GetPostCommentsResponseDto } from '@dans-coding-world/shared-post-dto';
import { BaseResponse } from '@dans-coding-world/api-types';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import {
  generateCommentThreads,
  generateRandomComments,
} from './comments-generator.js';
import type { Comment } from '@dans-coding-world/prisma-schema';

export function generateMockPostCommentsResponse({
  postId = 1,
  length = 10,
  pageSize = PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE,
  replyLevels = 0,
}: {
  postId: number;
  length: number;
  pageSize: number;
  replyLevels: number;
}): BaseResponse<GetPostCommentsResponseDto> {
  return {
    error: null,
    success: true,
    data: {
      items: generateCommentThreads(postId, length, replyLevels).slice(
        0,
        pageSize,
      ),
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

export function generateMockCommentResponse({
  postId,
  comment,
}: {
  postId: number;
  comment?: Partial<Comment>;
}) {
  const mockComment = generateRandomComments(postId, 1)[0];
  return {
    error: null,
    success: true,
    data: {
      comment: {
        ...mockComment,
        ...comment,
      },
    },
  };
}
