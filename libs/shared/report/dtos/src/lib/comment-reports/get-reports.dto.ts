import { IsOptional, IsInt, Min, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ToInteger,
  IsOffsetAlignedWithSize,
  IsSortBy,
} from '@dans-coding-world/validation';
import {
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import type { Report } from '@dans-coding-world/prisma-schema';
import { FilterReportsByDto } from './filter-reports-by.dto.js';
export class GetReportsDto {
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
  @IsIn(PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS,
    ]),
  })
  pageSize?: AllowedPageSizes;

  @IsOptional()
  @IsSortBy(['createdAt'] as ReportSortKey[])
  sortBy?: Partial<Record<ReportSortKey, 'asc' | 'desc'>>;

  @IsOptional()
  @ValidateNested()
  @Type(() => FilterReportsByDto)
  filterBy?: FilterReportsByDto;
}

type AllowedPageSizes =
  (typeof PAGINATION.REPORTS.ITEMS_PER_PAGE_OPTIONS)[number];

type ReportSortKey = keyof Pick<Report, 'createdAt'>;
