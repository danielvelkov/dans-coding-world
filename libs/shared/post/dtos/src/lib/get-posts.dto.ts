import { IsBoolean, IsNumber, IsOptional, IsIn } from 'class-validator';
import { VALIDATION_MESSAGES } from '@dans-coding-world/shared-constants';
import { POST_CONSTRAINTS } from '@dans-coding-world/shared-constants';
export class GetPostsDto {
  @IsBoolean()
  isLoggedIn: boolean;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsOptional()
  @IsNumber()
  @IsIn(POST_CONSTRAINTS.POSTS_PER_PAGE_OPTIONS, {
    message: VALIDATION_MESSAGES.allowedValues([
      ...POST_CONSTRAINTS.POSTS_PER_PAGE_OPTIONS,
    ]),
  })
  limit?: number;
}
