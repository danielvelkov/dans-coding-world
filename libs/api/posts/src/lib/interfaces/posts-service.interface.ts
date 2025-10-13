import {
  CreatePostDto,
  DeletePostDto,
  SearchPostsDto,
  UpdatePostDto,
  PostSearchResponseDto,
} from '@dans-coding-world/shared-post-dto';
import { Post } from '@dans-coding-world/prisma-schema';
export interface IPostsService {
  getById(id: number): Promise<Post>;
  getAll(
    dto: Omit<SearchPostsDto, 'searchQuery'>
  ): Promise<PostSearchResponseDto>;
  create(dto: CreatePostDto): Promise<Post>;
  update(dto: UpdatePostDto): Promise<Post>;
  delete(dto: DeletePostDto): Promise<boolean>;
  search(dto: SearchPostsDto): Promise<PostSearchResponseDto>;
}
