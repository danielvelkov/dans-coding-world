import {
  Post,
  PostOrderByInput,
  PostWhereInput,
} from '@dans-coding-world/prisma-schema';
import {
  SearchPostsDto,
  PostSearchResponseDto,
  CreatePostDto,
  UpdatePostDto,
  DeletePostDto,
} from '@dans-coding-world/shared-post-dto';
import { IPostsService } from '../interfaces/posts-service.interface.js';
import { Inject, Injectable } from 'injection-js';
import type {
  IPostRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { validateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';

export const POST_REPOSITORY_TOKEN = 'IPostRepository';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';

@Injectable()
export class PostsService implements IPostsService {
  constructor(
    @Inject(POST_REPOSITORY_TOKEN)
    public posts: IPostRepository<Post, PostWhereInput, PostOrderByInput>,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
  ) {}
  getById(id: number): Promise<Post> {
    throw new Error('Method not implemented.');
  }
  getAll(
    dto: Omit<SearchPostsDto, 'searchQuery'>
  ): Promise<PostSearchResponseDto> {
    throw new Error('Method not implemented.');
  }
  async create(dto: CreatePostDto): Promise<Post> {
    await validateDto(dto, CreatePostDto);

    const author = await this.users.getById(dto.authorId.toString());

    if (!author) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);

    if (author.role !== 'ADMIN')
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    const postAlreadyExists = await this.posts.exists(dto.title);
    if (postAlreadyExists)
      throw new ApiException(
        ERROR_CODES.VALIDATION.VALIDATION_ERROR,
        VALIDATION_MESSAGES.posts.titleAlreadyExists
      );

    const inputData: Parameters<typeof this.posts.create>[0] = {
      ...dto,
      visibility: dto.isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
      status: dto.isDraft ? 'DRAFT' : 'PUBLISHED',
      publishedAt: dto.isDraft ? null : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.posts.create(inputData);
  }
  update(dto: UpdatePostDto): Promise<Post> {
    throw new Error('Method not implemented.');
  }
  delete(dto: DeletePostDto): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  search(dto: SearchPostsDto): Promise<PostSearchResponseDto> {
    throw new Error('Method not implemented.');
  }
}
