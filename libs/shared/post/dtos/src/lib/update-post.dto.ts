import {
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
  IsArray,
  ArrayUnique,
  ArrayNotEmpty,
  IsBoolean,
} from 'class-validator';
import {
  TAG_CONSTRAINTS,
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import type {
  PostStatus,
  PostVisibility,
} from '@dans-coding-world/prisma-schema';
import {
  PostStatusEnum,
  PostVisibilityEnum,
} from '@dans-coding-world/prisma-schema';
import { Transform } from 'class-transformer';
import { ToBoolean, ToInteger } from '@dans-coding-world/validation';

export class UpdatePostDto {
  @ToInteger()
  @IsInt()
  @Min(0)
  postId: number;

  @ToInteger()
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
  @IsEnum(PostStatusEnum, {
    message: VALIDATION_MESSAGES.allowedValues(Object.values(PostStatusEnum)),
  })
  status?: PostStatus;

  @IsOptional()
  @IsEnum(PostVisibilityEnum, {
    message: VALIDATION_MESSAGES.allowedValues(
      Object.values(PostVisibilityEnum),
    ),
  })
  visibility?: PostVisibility;

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

  @IsOptional()
  @IsBoolean()
  @ToBoolean()
  clearTags?: boolean;
}
