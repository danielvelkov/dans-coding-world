import {
  MinLength,
  MaxLength,
  IsBoolean,
  IsInt,
  Min,
  IsOptional,
  IsArray,
  Matches,
  ArrayNotEmpty,
  ArrayUnique,
} from 'class-validator';
import {
  TAG_CONSTRAINTS,
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { Transform } from 'class-transformer';
import { toInteger } from './custom-transformers/to-integer.js';
import { ToBoolean } from './custom-transformers/to-boolean.js';

export class CreatePostDto {
  @Transform(toInteger)
  @IsInt()
  @Min(0)
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

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @MinLength(TAG_CONSTRAINTS.MIN_NAME_LENGTH, {
    each: true,
    message: VALIDATION_MESSAGES.minLength(TAG_CONSTRAINTS.MIN_NAME_LENGTH),
  })
  @MaxLength(TAG_CONSTRAINTS.MAX_NAME_LENGTH, {
    each: true,
    message: VALIDATION_MESSAGES.maxLength(TAG_CONSTRAINTS.MAX_NAME_LENGTH),
  })
  @Matches(TAG_CONSTRAINTS.NAME_PATTERN, {
    each: true,
    message: VALIDATION_MESSAGES.tags.invalid,
  })
  tags?: string[];

  @IsBoolean()
  @ToBoolean()
  isDraft: boolean;

  @IsBoolean()
  @ToBoolean()
  isMembersOnly: boolean;
}
