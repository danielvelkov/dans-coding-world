import { MinLength, MaxLength, IsBoolean, IsNumber } from 'class-validator';
import {
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
export class UpdatePostDto {
  @IsNumber()
  postId: number;
  @IsNumber()
  authorId: number;

  @MinLength(POST_CONSTRAINTS.MIN_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_TITLE_LENGTH),
  })
  @MaxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
  })
  title: string;

  @MinLength(POST_CONSTRAINTS.MIN_CONTENT_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(POST_CONSTRAINTS.MIN_CONTENT_LENGTH),
  })
  @MaxLength(POST_CONSTRAINTS.MAX_CONTENT_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_CONTENT_LENGTH),
  })
  content: string;

  @IsBoolean()
  isDraft: boolean;

  @IsBoolean()
  isMembersOnly: boolean;
}
