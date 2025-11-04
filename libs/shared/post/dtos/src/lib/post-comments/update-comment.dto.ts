import {
  COMMENT_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { Transform } from 'class-transformer';
import { IsInt, Min, MinLength, MaxLength } from 'class-validator';
import { toInteger } from '../custom-transformers/to-integer.js';

export class UpdateCommentDto {
  @Transform(toInteger)
  @IsInt()
  @Min(0)
  postId: number;

  @Transform(toInteger)
  @IsInt()
  @Min(0)
  commentId: number;

  @Transform(toInteger)
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
