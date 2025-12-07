import { IsInt, Min, MinLength, MaxLength, IsOptional } from 'class-validator';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { ToInteger } from '@dans-coding-world/validation';

export class CreateCommentDto {
  @ToInteger()
  @IsInt()
  @Min(0)
  userId: number;

  @ToInteger()
  @IsInt()
  @Min(0)
  postId: number;

  @MinLength(COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(
      COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH
    ),
  })
  @MaxLength(COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(
      COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH
    ),
  })
  content: string;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  replyToCommentId?: number;
}
