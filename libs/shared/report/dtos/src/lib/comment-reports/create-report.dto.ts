import {
  REPORT_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ToInteger } from '@dans-coding-world/validation';
import { IsInt, Min, MinLength, MaxLength } from 'class-validator';
export class CreateReportDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  reporterId: number;

  @IsInt()
  @Min(0)
  @ToInteger()
  postId: number;

  @IsInt()
  @Min(0)
  @ToInteger()
  commentId: number;

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
  reason: string;
}
