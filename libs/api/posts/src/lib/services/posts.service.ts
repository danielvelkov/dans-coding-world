import type {
  Post,
  PostOrderByInput,
  PostWhereInput,
  PostWithAuthorProfile,
  Tag,
} from '@dans-coding-world/prisma-schema';
import {
  GetPostsResponseDto,
  CreatePostDto,
  UpdatePostDto,
  DeletePostDto,
  GetPostDto,
  GetPostsDto,
  FilterPostsByDto,
  GetPostsMetadataResponse,
} from '@dans-coding-world/shared-post-dto';
import { IPostsService } from '../interfaces/posts-service.interface.js';
import { Inject, Injectable } from 'injection-js';
import type {
  IPostRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/api-exceptions';
import {
  ERROR_CODES,
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { filterObject } from '@dans-coding-world/helpers';
import { PostDetail, PostFull } from '@dans-coding-world/post-data-access';

export const POST_REPOSITORY_TOKEN = 'IPostRepository';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';

type DirectPrismaFilters = Pick<FilterPostsByDto, 'status' | 'visibility'>;

@Injectable()
export class PostsService implements IPostsService {
  constructor(
    @Inject(POST_REPOSITORY_TOKEN)
    public posts: IPostRepository<
      Post | PostDetail,
      PostWhereInput,
      PostOrderByInput
    >,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository,
  ) {}

  async getById(dto: GetPostDto): Promise<PostFull> {
    dto = await transformAndValidateDto(dto, GetPostDto);

    const post = (await this.posts.getById(dto.postId)) as PostFull;

    // Authorization check
    await this.validatePostReadAccess(post, dto.viewerId);

    const tagNames = this.extractTagNames(post);

    // Content masking for members-only posts
    if (this.isMembersOnly(post) && !dto.viewerId) {
      return {
        ...post,
        tags: tagNames,
        content: VALIDATION_MESSAGES.posts.membersOnly,
      };
    }

    return {
      ...post,
      tags: tagNames,
    };
  }

  async getAll(dto?: GetPostsDto): Promise<GetPostsResponseDto> {
    if (dto) dto = await transformAndValidateDto(dto, GetPostsDto);

    const where = await this.buildPostsWhereClause(
      dto?.viewerId,
      dto?.filterBy,
      dto?.searchQuery,
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
    const items = (posts as PostWithAuthorProfile[]).map((post) => {
      const tagNames = this.extractTagNames(post);

      if (this.isMembersOnly(post) && !dto?.viewerId) {
        return {
          ...post,
          tags: tagNames,
          content: VALIDATION_MESSAGES.posts.membersOnly,
        };
      } else
        return {
          ...post,
          tags: tagNames,
        };
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

  async create(dto: CreatePostDto): Promise<PostFull> {
    dto = await transformAndValidateDto(dto, CreatePostDto);

    const author = await this.users.getById(dto.authorId.toString());

    if (!author) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);

    const postAlreadyExists = await this.posts.exists(dto.title);

    if (postAlreadyExists)
      throw new ApiException(ERROR_CODES.VALIDATION.POST_EXISTS);

    const inputData: Omit<PostDetail, 'id'> = {
      title: dto.title,
      content: dto.content,
      visibility: dto.isMembersOnly ? 'MEMBERS_ONLY' : 'PUBLIC',
      status: dto.isDraft ? 'DRAFT' : 'PUBLISHED',
      publishedAt: dto.isDraft ? null : new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: dto.authorId,
      tags: this.extractUniqueStrings(dto.tags),
    };

    const post = (await this.posts.create(inputData)) as PostFull;

    return { ...post, tags: this.extractTagNames(post) };
  }

  async update(dto: UpdatePostDto): Promise<PostFull> {
    dto = await transformAndValidateDto(dto, UpdatePostDto);

    const postForUpdate = (await this.posts.getById(dto.postId)) as Post;

    await this.validatePostWriteAccess(postForUpdate, dto.userId);

    if (
      dto.title &&
      postForUpdate.title.toLowerCase() !== dto.title.toLowerCase()
    ) {
      const postAlreadyExists = await this.posts.exists(dto.title);
      if (postAlreadyExists)
        throw new ApiException(ERROR_CODES.VALIDATION.POST_EXISTS);
    }

    const filtered = filterObject(dto, Object.keys(postForUpdate));

    const post = (await this.posts.update(dto.postId, {
      ...filtered,
      tags: dto.clearTags ? [] : this.extractUniqueStrings(filtered.tags),
      updatedAt: new Date(),
      ...(!postForUpdate.publishedAt &&
        dto.status === 'PUBLISHED' && { publishedAt: new Date() }),
    })) as PostFull;

    return { ...post, tags: this.extractTagNames(post) };
  }

  async delete(dto: DeletePostDto): Promise<PostFull> {
    dto = await transformAndValidateDto(dto, DeletePostDto);

    const post = await this.posts.getById(dto.postId);

    await this.validatePostWriteAccess(post, dto.authorId);

    return (await this.posts.delete(dto.postId)) as PostFull;
  }
  /**
   * Checks if post exists and that the user is allowed READ access to it.
   *
   * **Access control:**
   * - For PUBLISHED posts everyone has access
   * - Author of the post has access by default
   * - Admins and Mods have access too
   *
   * @param post The post in question
   * @param viewerId Id of the user trying to access the post
   */
  private async validatePostReadAccess(
    post: PostDetail | null,
    viewerId?: number,
  ): Promise<void> {
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (viewerId) {
      const user = await this.users.getById(viewerId.toString());
      if (user && (user.role === 'ADMIN' || user.role === 'MOD')) return;
    }
    if (!this.isPublished(post) && !this.isAuthor(post, viewerId)) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }
  }

  /**
   * Checks if post exists and that the user is allowed WRITE access to it.
   *
   * **Access control:**
   * - Author of the post has access by default
   * - Admins have access too
   *
   * @param post The post in question
   * @param viewerId Id of the user trying to access the post
   */
  private async validatePostWriteAccess(
    post: PostDetail | null,
    viewerId: number,
  ): Promise<void> {
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    const user = await this.users.getById(viewerId.toString());
    if (user && user.role === 'ADMIN') return;

    if (!this.isAuthor(post, viewerId)) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }
  }

  private async buildPostsWhereClause(
    viewerId?: number,
    filters?: GetPostsDto['filterBy'],
    searchQuery?: string,
  ): Promise<PostWhereInput> {
    const clauses: PostWhereInput[] = [];

    let isAdmin = false;

    if (viewerId) {
      const user = await this.users.getById(viewerId.toString());
      if (!user) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);
      if (user && user.role === 'ADMIN') {
        isAdmin = true;
      }
    }

    // STEP 1: Access Control - What CAN the user see?
    if (!isAdmin) {
      if (!viewerId) {
        // Not logged in: exclude private posts entirely
        clauses.push({
          NOT: {
            status: {
              in: ['DRAFT', 'ARCHIVED'],
            },
          },
        });
      } else {
        // Logged in (Non-Admin): can see own posts (any status) OR others' published posts
        clauses.push({
          OR: [{ authorId: viewerId }, { status: 'PUBLISHED' }],
        });
      }
    }

    // STEP 2: Default Filters - Apply only if no explicit filtering and search specified
    if (!filters && !searchQuery) {
      filters = {
        status: ['PUBLISHED'],
        visibility: ['MEMBERS_ONLY', 'PUBLIC'],
      };
    }

    // STEP 3: Explicit Filters - What DOES the user want to see?
    if (filters) {
      const directFilters: DirectPrismaFilters = {
        status: filters.status,
        visibility: filters.visibility,
      };

      // STEP 3.1: Filtering by status and visibility
      const filterConditions = Object.entries(directFilters)
        .filter(([, arr]) => Array.isArray(arr) && arr.length)
        .map(([key, value]) => ({ [key]: { in: value } }));

      clauses.push(...filterConditions);

      // STEP 3.2: Filtering by post tags
      if (filters.tags && filters.tags.length > 0) {
        clauses.push({
          tags: {
            some: {
              tag: {
                name: {
                  in: filters.tags,
                },
              },
            },
          },
        });
      }

      // STEP 3.3: Filtering by year
      if (filters.year && Number.isInteger(filters.year))
        clauses.push({
          publishedAt: {
            gte: new Date(filters.year, 0, 1),
            lte: new Date(filters.year, 11, 31),
          },
        });

      // STEP 3.4: Filtering by user
      if (filters.userId && Number.isInteger(filters.userId))
        clauses.push({
          authorId: filters.userId,
        });
    }

    // STEP 4: Search Query
    if (searchQuery) {
      clauses.push({
        OR: [
          { content: { contains: searchQuery.trim(), mode: 'insensitive' } },
          { title: { contains: searchQuery.trim(), mode: 'insensitive' } },
        ],
      });
    }

    return { AND: clauses };
  }

  async getMetadata(): Promise<GetPostsMetadataResponse> {
    const years = await this.posts.getPublishedYears();
    return { years };
  }

  private isAuthor = (post: Post, userId?: number) =>
    userId !== undefined && post.authorId === userId;
  private isPublished = (post: Post) => post.status === 'PUBLISHED';
  private isMembersOnly = (post: Post) => post.visibility === 'MEMBERS_ONLY';
  private extractUniqueStrings = (arr: string[] | undefined) =>
    arr?.reduce(
      (acc, val) => (acc.includes(val) ? acc : [...acc, val]),
      [] as string[],
    );
  private extractTagNames = (post: Post) => {
    const postTags = (post as PostDetail).tags as { tag: Tag }[] | undefined;
    return postTags?.map((t) => t.tag.name) ?? [];
  };
}
