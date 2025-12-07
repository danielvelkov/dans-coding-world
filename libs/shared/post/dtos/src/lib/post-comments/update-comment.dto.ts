import {
  COMMENT_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';

export class UpdateCommentDto {
  @ToInteger()
  @IsInt()
  @Min(0)
  postId: number;

  @ToInteger()
  @IsInt()
  @Min(0)
  commentId: number;

  @ToInteger()
  @IsInt()
  @Min(0)
  userId: number;

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
}
