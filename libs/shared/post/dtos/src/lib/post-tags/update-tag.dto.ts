import { IsInt, Min, MinLength, MaxLength, Matches } from 'class-validator';
import {
  TAG_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { Transform } from 'class-transformer';
import { toInteger } from '../custom-transformers/to-integer.js';

export class UpdateTagDto {
  @Transform(toInteger)
  @Min(0)
  @IsInt()
  tagId: number;

  @MinLength(TAG_CONSTRAINTS.MIN_NAME_LENGTH, {
    message: VALIDATION_MESSAGES.minLength(TAG_CONSTRAINTS.MIN_NAME_LENGTH),
  })
  @MaxLength(TAG_CONSTRAINTS.MAX_NAME_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(TAG_CONSTRAINTS.MAX_NAME_LENGTH),
  })
  @Matches(TAG_CONSTRAINTS.NAME_PATTERN, {
    message: VALIDATION_MESSAGES.tags.invalid,
  })
  name: string;
}
