import {
  IsOptional,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
  ArrayNotEmpty,
  IsInt,
  IsPositive,
  Min,
} from 'class-validator';
import {
  PostStatus,
  PostVisibility,
  PostStatusEnum,
  PostVisibilityEnum,
} from '@dans-coding-world/prisma-schema';
import { Transform } from 'class-transformer';
import {
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { ToInteger } from '@dans-coding-world/validation';

export class FilterPostsByDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PostStatusEnum, {
    each: true,
    message: `Post status must be one of:${Object.values(PostStatusEnum).join(
      '',
    )}`,
  })
  status?: PostStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PostVisibilityEnum, {
    each: true,
    message: `Post visibility must be one of:${Object.values(
      PostVisibilityEnum,
    ).join('')}`,
  })
  visibility?: PostVisibility[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
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
  @ToInteger()
  @IsInt()
  @IsPositive()
  year?: number;

  @IsOptional()
  @ToInteger()
  @IsInt()
  @Min(0)
  userId?: number;
}
