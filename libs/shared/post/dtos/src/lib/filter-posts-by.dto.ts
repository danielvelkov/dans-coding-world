import { IsOptional, IsArray, IsEnum } from 'class-validator';
import {
  PostStatus,
  PostVisibility,
  PostStatusEnum,
  PostVisibilityEnum,
} from '@dans-coding-world/prisma-schema';
import { Transform } from 'class-transformer';

export class FilterPostsByDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsEnum(PostStatusEnum, {
    each: true,
    message: `Post status must be one of:${Object.values(PostStatusEnum).join(
      ''
    )}`,
  })
  status?: PostStatus[];

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsEnum(PostVisibilityEnum, {
    each: true,
    message: `Post visibility must be one of:${Object.values(
      PostVisibilityEnum
    ).join('')}`,
  })
  visibility?: PostVisibility[];
}
