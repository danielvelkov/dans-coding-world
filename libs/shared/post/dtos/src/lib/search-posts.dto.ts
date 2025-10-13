import { MaxLength, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import {
  POST_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { GetPostsDto } from './get-posts.dto.js';
export class SearchPostsDto extends GetPostsDto {
  @MaxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH, {
    message: VALIDATION_MESSAGES.maxLength(POST_CONSTRAINTS.MAX_TITLE_LENGTH),
  })
  searchQuery: string;
}
