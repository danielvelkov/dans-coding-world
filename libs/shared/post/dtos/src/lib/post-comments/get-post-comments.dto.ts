import type { Comment } from '@dans-coding-world/prisma-schema';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  COMMENT_CONSTRAINTS,
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import {
  ToInteger,
  IsSortBy,
  IsOffsetAlignedWithSize,
} from '@dans-coding-world/validation';

export class GetPostCommentsDto {
  @ToInteger()
  @IsInt()
  @Min(0)
  postId: number;

  @ToInteger()
  @IsInt()
  @Min(0)
  @IsOptional()
  viewerId?: number;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  @IsOffsetAlignedWithSize('pageSize', {
    message: VALIDATION_MESSAGES.pagination.pageOffsetNotDivisibleByPageLimit,
  })
  pageOffset?: number;

  @IsOptional()
  @ToInteger()
  @IsIn(PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  @IsSortBy(['createdAt', 'updatedAt'] as CommentSortKey[])
  sortBy?: Partial<Record<CommentSortKey, 'asc' | 'desc'>>;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(COMMENT_CONSTRAINTS.MIN_REPLY_TREE_DEPTH)
  @Max(COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
  maxReplyLevels?: number;
}

type AllowedPageSizes =
  (typeof PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS)[number];

type CommentSortKey = keyof Pick<Comment, 'createdAt' | 'updatedAt'>;
