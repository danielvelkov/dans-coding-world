import { Comment } from '@dans-coding-world/prisma-schema';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import {
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { IsOffsetAlignedWithSize } from '../custom-validators/is-offset-aligned-with-size.js';
import { Transform } from 'class-transformer';
import { toInteger } from '../custom-transformers/to-integer.js';
import { IsSortBy } from '../custom-validators/is-sort-by.js';

export class GetPostCommentsDto {
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  postId: number;

  @Transform(toInteger)
  @IsInt()
  @Min(0)
  @IsOptional()
  viewerId?: number;

  @IsOptional()
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  @IsOffsetAlignedWithSize('pageSize', {
    message: VALIDATION_MESSAGES.pagination.pageOffsetNotDivisibleByPageLimit,
  })
  pageOffset?: number;

  @IsOptional()
  @Transform(toInteger)
  @IsIn(PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  @IsSortBy(['createdAt', 'updatedAt'] as CommentSortKey[])
  sortBy?: Partial<Record<CommentSortKey, 'asc' | 'desc'>>;
}

type AllowedPageSizes =
  (typeof PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS)[number];

type CommentSortKey = keyof Pick<Comment, 'createdAt' | 'updatedAt'>;
