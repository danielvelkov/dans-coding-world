import { ReportStatusEnum } from '@dans-coding-world/prisma-schema';
import type { ReportStatus } from '@dans-coding-world/prisma-schema';
import {
  REPORT_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ToInteger } from '@dans-coding-world/validation';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class UpdateReportDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  reportId: number;

  @IsInt()
  @Min(0)
  @ToInteger()
  moderatorId: number;

  @IsEnum(ReportStatusEnum, {
    message: VALIDATION_MESSAGES.allowedValues(Object.values(ReportStatusEnum)),
  })
  status: ReportStatus;

  @IsOptional()
  @IsString()
  @MinLength(REPORT_CONSTRAINTS.MIN_REASON_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      REPORT_CONSTRAINTS.MIN_REASON_LENGTH
    ),
  })
  @MaxLength(REPORT_CONSTRAINTS.MAX_REASON_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      REPORT_CONSTRAINTS.MAX_REASON_LENGTH
    ),
  })
  note?: string;
}
