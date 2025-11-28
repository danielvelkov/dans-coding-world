import {
  IsInt,
  IsOptional,
  IsIn,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  VALIDATION_MESSAGES,
  POST_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { PAGINATION } from '@dans-coding-world/shared-constants';
import { Post } from '@dans-coding-world/prisma-schema';
import { Type } from 'class-transformer';
import { FilterPostsByDto } from './filter-posts-by.dto.js';

import {
  ToInteger,
  IsSortBy,
  IsOffsetAlignedWithSize,
} from '@dans-coding-world/validation';

export class GetPostsDto {
  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
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
  @IsInt()
  @Min(0)
  @IsIn(PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  @IsSortBy(['createdAt', 'publishedAt', 'updatedAt'] as PostSortKey[])
  sortBy?: Partial<Record<PostSortKey, 'asc' | 'desc'>>;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilterPostsByDto)
  filterBy?: FilterPostsByDto;

  @IsOptional()
  @MaxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
  })
  searchQuery?: string;
}

type AllowedPageSizes =
  (typeof PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS)[number];

type PostSortKey = keyof Pick<Post, 'createdAt' | 'publishedAt' | 'updatedAt'>;
