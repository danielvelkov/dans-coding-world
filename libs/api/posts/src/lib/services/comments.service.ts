import {
  Comment,
  CommentsOrderByInput,
  CommentWhereInput,
  Post,
  PostOrderByInput,
  PostWhereInput,
} from '@dans-coding-world/prisma-schema';
import { ICommentsService } from '../interfaces/comments-service.interface.js';
import {
  GetPostCommentRepliesDto,
  GetPostCommentsDto,
  GetPostCommentsResponseDto,
  GetPostCommentRepliesResponseDto,
  CreateCommentDto,
  DeleteCommentDto,
  UpdateCommentDto,
} from '@dans-coding-world/shared-post-dto';
import { Inject, Injectable } from 'injection-js';
import type {
  ICommentRepository,
  IPostRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { validateDto } from '@dans-coding-world/validation';
import {
  USER_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
} from './posts.service.js';
import { ApiException } from '@dans-coding-world/exceptions';
import { ERROR_CODES, PAGINATION } from '@dans-coding-world/shared-constants';

export const COMMENT_REPOSITORY_TOKEN = 'ICommentRepository';

/**
 * Service related to user comments on posts and reply threads
 *
 * @example
 * ```typescript
 * const {items, count} = commentsService.getPostComments({postId: 1, viewerId: 1})
 * ```
 */
@Injectable()
export class CommentsService implements ICommentsService {
  constructor(
    @Inject(COMMENT_REPOSITORY_TOKEN)
    public comments: ICommentRepository<
      Comment,
      CommentWhereInput,
      CommentsOrderByInput
    >,
    @Inject(POST_REPOSITORY_TOKEN)
    public posts: IPostRepository<Post, PostWhereInput, PostOrderByInput>,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
  ) {}

  async getPostComments(
    dto: GetPostCommentsDto
  ): Promise<GetPostCommentsResponseDto> {
    await validateDto(dto, GetPostCommentsDto);
    await this.validatePostAccess(dto.postId, dto.viewerId);

    const orderBy = dto.sortBy ?? { createdAt: 'desc' };
    const limit = dto.pageSize ?? PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE;
    const offset = dto.pageOffset ?? 0;

    const [comments, total] = await Promise.all([
      this.comments.search({ postId: dto.postId, depth: 0 }, orderBy, {
        skip: offset,
        take: limit,
        includeReplies: true,
      }),
      this.comments.count({ postId: dto.postId }),
    ]);

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(comments.length / limit);

    return {
      items: comments.map((c) => ({
        ...c,
        replies: (c as any).replies as any,
      })),
      count: comments.length,
      pagination: {
        page: currentPage,
        totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        limit,
        total,
      },
    };
  }

  async getCommentReplies(
    dto: GetPostCommentRepliesDto
  ): Promise<GetPostCommentRepliesResponseDto> {
    await validateDto(dto, GetPostCommentRepliesDto);

    await this.validatePostAccess(dto.postId, dto.viewerId);

    const comment = await this.comments.getById(dto.commentId, {
      includeReplies: true,
    });

    if (!comment) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    return {
      comment: { ...comment, replies: (comment as any).replies },
      replyCount: this.getReplyCountRecursively(comment as CommentWithReplies),
    };
  }

  async create(dto: CreateCommentDto): Promise<Comment> {
    await validateDto(dto, CreateCommentDto);

    await this.validatePostAccess(dto.postId, dto.userId);

    let depth = 0;
    if (dto.replyToCommentId) {
      const parent = await this.comments.getById(dto.replyToCommentId);
      if (!parent || parent.postId !== dto.postId) {
        throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
      }
      depth = parent.depth + 1;
    }

    return await this.comments.create({
      content: dto.content,
      depth,
      postId: dto.postId,
      userId: dto.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      threadParentId: dto.replyToCommentId ?? null,
    });
  }
  async delete(dto: DeleteCommentDto): Promise<Comment> {
    await validateDto(dto, DeleteCommentDto);

    await this.validatePostAccess(dto.postId, dto.authorId);

    const comment = await this.comments.getById(dto.commentId);
    if (!comment || comment.postId !== dto.postId) {
      throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
    }

    if (comment.userId !== dto.authorId) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }

    return await this.comments.delete(dto.commentId);
  }

  async update(dto: UpdateCommentDto): Promise<Comment> {
    await validateDto(dto, UpdateCommentDto);

    await this.validatePostAccess(dto.postId);

    const commentForUpdate = await this.comments.getById(dto.commentId);
    if (!commentForUpdate) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (commentForUpdate.userId !== dto.userId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);

    return await this.comments.update(dto.commentId, {
      updatedAt: new Date(),
      content: dto.content,
    });
  }

  private async validatePostAccess(
    postId: number,
    viewerId?: number
  ): Promise<Post> {
    const post = await this.posts.getById(postId);
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (post.status !== 'PUBLISHED') {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }

    if (!viewerId && post.visibility === 'MEMBERS_ONLY') {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }

    return post;
  }

  private getReplyCountRecursively(comment: CommentWithReplies) {
    let sum = 0;
    comment.replies?.forEach((c) => {
      sum++;
      if (c.replies) sum += this.getReplyCountRecursively(c);
    });
    return sum;
  }
}

type CommentWithReplies = Comment & { replies: CommentWithReplies[] };
