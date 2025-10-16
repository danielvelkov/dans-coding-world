import {
  Post,
  PostOrderByInput,
  PostWhereInput,
} from '@dans-coding-world/prisma-schema';
import {
  GetPostsResponseDto,
  CreatePostDto,
  UpdatePostDto,
  DeletePostDto,
  GetPostDto,
  GetPostsDto,
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
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';

export const POST_REPOSITORY_TOKEN = 'IPostRepository';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';

/*
  NOTE
  I really don't like how this is turning out. 
  A lot of implicit logic is happening behind the scenes of every method call here.
  Should be refactored somehow. 
 */

@Injectable()
export class PostsService implements IPostsService {
  constructor(
    @Inject(POST_REPOSITORY_TOKEN)
    public posts: IPostRepository<Post, PostWhereInput, PostOrderByInput>,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
  ) {}
  async getById(dto: GetPostDto): Promise<Post> {
    await validateDto(dto, GetPostDto);
    const post = await this.posts.getById(dto.id);
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    // Authorization check
    this.verifyPostAccess(post, dto.viewerId);

    // Content masking for members-only posts
    if (this.isMembersOnly(post) && !dto.viewerId) {
      return { ...post, content: VALIDATION_MESSAGES.posts.membersOnly };
    }

    return post;
  }

  async getAll(dto?: GetPostsDto): Promise<GetPostsResponseDto> {
    if (dto) await validateDto(dto, GetPostsDto);

    // console.log(dto);

    // const test = await this.posts.search()
    // console.log(test)

    const where = this.buildPostsWhereClause(
      dto?.viewerId,
      dto?.filterBy ?? {
        status: ['PUBLISHED'],
        visibility: ['MEMBERS_ONLY', 'PUBLIC'],
      },
      dto?.searchQuery
    );
    const orderBy = { ...dto?.sortBy } as PostOrderByInput;

    const [posts, total] = await Promise.all([
      this.posts.search(where, orderBy, {
        skip: dto?.pageOffset ?? 0,
        take: dto?.pageSize ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE,
      }),
      this.posts.count(where),
    ]);

    const postsPerPage =
      dto?.pageSize ?? PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE;
    const currentPage = Math.floor((dto?.pageOffset ?? 0) / postsPerPage) + 1;
    const totalPages = Math.ceil(total / postsPerPage);

    // Hide Members-only content for guests
    const items = posts.map((post) => {
      if (this.isMembersOnly(post) && !dto?.viewerId) {
        return { ...post, content: VALIDATION_MESSAGES.posts.membersOnly };
      } else return post;
    });

    return {
      items,
      count: posts.length,
      pagination: {
        total,
        limit: postsPerPage,
        page: currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
    };
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

  async update(dto: UpdatePostDto): Promise<Post> {
    await validateDto(dto, UpdatePostDto);

    const postForUpdate = await this.posts.getById(dto.postId);
    if (!postForUpdate) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (postForUpdate.authorId !== dto.userId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    if (
      dto.title &&
      postForUpdate.title.toLowerCase() !== dto.title.toLowerCase()
    ) {
      const postAlreadyExists = await this.posts.exists(dto.title);
      if (postAlreadyExists)
        throw new ApiException(
          ERROR_CODES.VALIDATION.VALIDATION_ERROR,
          VALIDATION_MESSAGES.posts.titleAlreadyExists
        );
    }

    return await this.posts.update(dto.postId, {
      ...dto,
      updatedAt: new Date(),
      ...(!postForUpdate.publishedAt &&
        dto.status === 'PUBLISHED' && { publishedAt: new Date() }),
    });
  }

  async delete(dto: DeletePostDto): Promise<Post> {
    await validateDto(dto, DeletePostDto);

    const post = await this.posts.getById(dto.postId);

    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
    else if (post.authorId !== dto.authorId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    return await this.posts.delete(dto.postId);
  }

  private verifyPostAccess(post: Post, userId?: number): void {
    if (!this.isPublished(post) && !this.isAuthor(post, userId)) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }
  }

  private buildPostsWhereClause(
    viewerId?: number,
    filters?: GetPostsDto['filterBy'],
    searchQuery?: string
  ): PostWhereInput {
    const clauses: PostWhereInput[] = [];

    if (filters) {
      clauses.push({
        AND: Object.entries(filters)
          .filter(([_, arr]) => Array.isArray(arr) && arr.length)
          .map(([key, value]) => {
            return {
              [key]: {
                in: value,
              },
            };
          }),
      });
    }

    if (
      filters?.status &&
      (filters.status.includes('ARCHIVED') ||
        filters.status.includes('DRAFT')) &&
      viewerId
    )
      clauses.push({
        AND: {
          authorId: viewerId,
          status: {
            in: ['ARCHIVED', 'DRAFT'],
          },
        },
      });

    // search for matches in title or post content
    if (searchQuery)
      clauses.push({
        OR: [
          {
            content: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
          {
            title: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        ],
      });

    // console.dir(clauses, { depth: 34 });
    return { AND: clauses };
  }

  private isAuthor = (post: Post, userId?: number) =>
    userId !== undefined && post.authorId === userId;
  private isPublished = (post: Post) => post.status === 'PUBLISHED';
  private isMembersOnly = (post: Post) => post.visibility === 'MEMBERS_ONLY';
}
