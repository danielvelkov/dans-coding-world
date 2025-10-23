import { Comment } from '@dans-coding-world/prisma-schema';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import {
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { IsOffsetAlignedWithSize } from '../custom-validators/is-offset-aligned-with-size.js';

export class GetPostCommentsDto {
  @IsInt()
  @Min(0)
  postId: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  viewerId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @IsOffsetAlignedWithSize('pageSize', {
    message: VALIDATION_MESSAGES.pagination.pageOffsetNotDivisibleByPageLimit,
  })
  pageOffset?: number;

  @IsOptional()
  @IsIn(PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  sortBy?: Partial<
    Record<keyof Pick<Comment, 'createdAt' | 'updatedAt'>, 'asc' | 'desc'>
  >;
}

type AllowedPageSizes =
  (typeof PAGINATION.COMMENTS.ITEMS_PER_PAGE_OPTIONS)[number];
