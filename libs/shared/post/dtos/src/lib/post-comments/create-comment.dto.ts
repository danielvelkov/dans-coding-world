import { IsInt, Min, MinLength, MaxLength, IsOptional } from 'class-validator';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { Transform } from 'class-transformer';
import { toInteger } from '../custom-transformers/to-integer.js';

export class CreateCommentDto {
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  userId: number;

  @Transform(toInteger)
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
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  replyToCommentId?: number;
}
