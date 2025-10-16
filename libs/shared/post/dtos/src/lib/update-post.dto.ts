import { IsInt, Min, MinLength, MaxLength, IsOptional } from 'class-validator';
import {
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import type {
  PostStatus,
  PostVisibility,
} from '@dans-coding-world/prisma-schema';
export class UpdatePostDto {
  @IsInt()
  @Min(0)
  postId: number;

  @IsInt()
  @Min(0)
  userId: number;

  @IsOptional()
  @MinLength(POST_CONSTRAINTS.MIN_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_TITLE_LENGTH),
  })
  @MaxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
  })
  title?: string;

  @IsOptional()
  @MinLength(POST_CONSTRAINTS.MIN_CONTENT_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_CONTENT_LENGTH),
  })
  @MaxLength(POST_CONSTRAINTS.MAX_CONTENT_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_CONTENT_LENGTH),
  })
  content?: string;

  @IsOptional()
  status?: PostStatus;

  @IsOptional()
  visibility?: PostVisibility;
}
