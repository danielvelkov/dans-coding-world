import { IsNumber } from 'class-validator';
import { CreatePostDto } from './create-post.dto.js';
export type UpdatePostDto = Partial<CreatePostDto> & PostEntryId;

class PostEntryId {
  @IsNumber()
  id: number;
}
