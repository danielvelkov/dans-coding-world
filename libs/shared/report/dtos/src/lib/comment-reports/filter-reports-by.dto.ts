import {
  IsOptional,
  IsArray,
  IsEnum,
  ArrayNotEmpty,
  IsInt,
  Min,
} from 'class-validator';
import {
  ReportStatusEnum,
  ReportStatus,
} from '@dans-coding-world/prisma-schema';
import { Transform } from 'class-transformer';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { ToInteger } from '@dans-coding-world/validation';

export class FilterReportsByDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ReportStatusEnum, {
    each: true,
    message: VALIDATION_MESSAGES.allowedValues(Object.values(ReportStatusEnum)),
  })
  status?: ReportStatus[];

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  maliciousUserId?: number;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  postId?: number;
}
