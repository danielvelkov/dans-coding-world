import {
  Post,
  PostOrderByInput,
  PostWhereInput,
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
} from '@dans-coding-world/shared-post-dto';
import { IPostsService } from '../interfaces/posts-service.interface.js';
import { Inject, Injectable } from 'injection-js';
import type {
  IPostRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { transformAndValidateDto } from '@dans-coding-world/validation';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  PAGINATION,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { filterObject } from '../helper/util.js';
import { PostDetail } from '@dans-coding-world/post-data-access';

export const POST_REPOSITORY_TOKEN = 'IPostRepository';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';

type DirectPrismaFilters = Pick<FilterPostsByDto, 'status' | 'visibility'>;

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
    public posts: IPostRepository<PostDetail, PostWhereInput, PostOrderByInput>,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
  ) {}

  async getById(dto: GetPostDto): Promise<PostDetail> {
    dto = await transformAndValidateDto(dto, GetPostDto);

    const post = await this.posts.getById(dto.postId);
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    // Authorization check
    this.verifyPostAccess(post, dto.viewerId);

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

    const where = this.buildPostsWhereClause(
      dto?.viewerId,
      dto?.filterBy,
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

  async create(dto: CreatePostDto): Promise<PostDetail> {
    dto = await transformAndValidateDto(dto, CreatePostDto);

    const author = await this.users.getById(dto.authorId.toString());

    if (!author) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);

    const postAlreadyExists = await this.posts.exists(dto.title);

    if (postAlreadyExists)
      throw new ApiException(ERROR_CODES.VALIDATION.POST_EXISTS);

    const inputData: Parameters<typeof this.posts.create>[0] = {
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

    const post = await this.posts.create(inputData);

    return { ...post, tags: this.extractTagNames(post) };
  }

  async update(dto: UpdatePostDto): Promise<PostDetail> {
    dto = await transformAndValidateDto(dto, UpdatePostDto);

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
        throw new ApiException(ERROR_CODES.VALIDATION.POST_EXISTS);
    }

    const filtered = filterObject(dto, Object.keys(postForUpdate));

    const post = await this.posts.update(dto.postId, {
      ...filtered,
      tags: this.extractUniqueStrings(filtered.tags),
      updatedAt: new Date(),
      ...(!postForUpdate.publishedAt &&
        dto.status === 'PUBLISHED' && { publishedAt: new Date() }),
    });

    return { ...post, tags: this.extractTagNames(post) };
  }

  async delete(dto: DeletePostDto): Promise<PostDetail> {
    dto = await transformAndValidateDto(dto, DeletePostDto);

    const post = await this.posts.getById(dto.postId);

    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
    else if (post.authorId !== dto.authorId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    return await this.posts.delete(dto.postId);
  }

  private verifyPostAccess(post: PostDetail, userId?: number): void {
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

    // STEP 1: Access Control - What CAN the user see?
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
      // Logged in: can see own posts (any status) OR others' published posts
      clauses.push({
        OR: [{ authorId: viewerId }, { status: 'PUBLISHED' }],
      });
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
            gte: new Date(`${filters.year}-01-01`),
            lte: new Date(`${filters.year}-12-31`),
          },
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

  private isAuthor = (post: Post, userId?: number) =>
    userId !== undefined && post.authorId === userId;
  private isPublished = (post: Post) => post.status === 'PUBLISHED';
  private isMembersOnly = (post: Post) => post.visibility === 'MEMBERS_ONLY';
  private extractUniqueStrings = (arr: string[] | undefined) =>
    arr?.reduce(
      (acc, val) => (acc.includes(val) ? acc : [...acc, val]),
      [] as string[]
    );
  private extractTagNames = (post: Post) => {
    const postTags = (post as PostDetail).tags as { tag: Tag }[] | undefined;
    return postTags?.map((t) => t.tag.name) ?? [];
  };
}
