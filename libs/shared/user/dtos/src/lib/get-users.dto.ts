import {
  IsIn,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  IsOffsetAlignedWithSize,
  IsSortBy,
  ToInteger,
} from '@dans-coding-world/validation';
import {
  PAGINATION,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { Type } from 'class-transformer';
import { FilterUsersByDto } from './filter-users-by.dto.js';

export class GetUsersDto {
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
  @IsIn(PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  @IsSortBy(['username'])
  sortBy?: Partial<{ username: 'asc' | 'desc' }>;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilterUsersByDto)
  filterBy?: FilterUsersByDto;

  @IsOptional()
  @MaxLength(USER_CONSTRAINTS.MAX_USERNAME_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      USER_CONSTRAINTS.MAX_USERNAME_LENGTH,
    ),
  })
  searchQuery?: string;
}

type AllowedPageSizes =
  (typeof PAGINATION.USERS.ITEMS_PER_PAGE_OPTIONS)[number];
