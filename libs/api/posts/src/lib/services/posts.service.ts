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

  async getAll(dto?: GetPostsDto): Promise<PostSearchResponseDto> {
    if (dto) await validateDto(dto, GetPostsDto);

    const where = this.buildPostsWhereClause(dto?.viewerId);
    const orderBy = { publishedAt: 'desc' } as PostOrderByInput;

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
  update(dto: UpdatePostDto): Promise<Post> {
    throw new Error('Method not implemented.');
  }
  delete(dto: DeletePostDto): Promise<boolean> {
    throw new Error('Method not implemented.');
  }
  search(dto: SearchPostsDto): Promise<PostSearchResponseDto> {
    throw new Error('Method not implemented.');
  }

  private verifyPostAccess(post: Post, userId?: number): void {
    if (!this.isPublished(post) && !this.isAuthor(post, userId)) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }
  }

  private buildPostsWhereClause(viewerId?: number): PostWhereInput {
    const clauses: PostWhereInput[] = [
      // Add PUBLISHED posts by default
      {
        status: 'PUBLISHED',
      },
    ];

    // Add user's own drafts or archived posts
    if (viewerId) {
      clauses.push({
        AND: [
          {
            OR: [
              {
                status: 'DRAFT',
              },
              { status: 'ARCHIVED' },
            ],
          },
          { authorId: viewerId },
        ],
      });
    }

    return { OR: clauses };
  }

  private isAuthor = (post: Post, userId?: number) =>
    userId !== undefined && post.authorId === userId;
  private isPublished = (post: Post) => post.status === 'PUBLISHED';
  private isMembersOnly = (post: Post) => post.visibility === 'MEMBERS_ONLY';
}
