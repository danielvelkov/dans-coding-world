import {
  CommentWithReplies,
  Comment,
  CommentsOrderByInput,
  CommentWhereInput,
  Post,
  PostOrderByInput,
  PostWhereInput,
} from '@dans-coding-world/prisma-schema';
import { ICommentsService } from '../interfaces/comments-service.interface.js';
import {
  GetCommentDto,
  GetPostCommentsDto,
  GetPostCommentsResponseDto,
  GetCommentResponseDto,
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
import { transformAndValidateDto } from '@dans-coding-world/validation';
import {
  USER_REPOSITORY_TOKEN,
  POST_REPOSITORY_TOKEN,
} from './posts.service.js';
import { ApiException } from '@dans-coding-world/exceptions';
import {
  COMMENT_CONSTRAINTS,
  ERROR_CODES,
  PAGINATION,
} from '@dans-coding-world/shared-constants';

export const COMMENT_REPOSITORY_TOKEN = 'ICommentRepository';

/**
 * Service related to user comments on posts and reply threads.
 *
 * **Access control:**
 * - Users can comment on posts, edit and delete their comments if post is PUBLISHED
 * - Moderators and Admins have full access to view, edit and delete other users' comments.
 *
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
    dto = await transformAndValidateDto(dto, GetPostCommentsDto);

    await this.validatePostAccess(dto.postId, dto.viewerId);

    const orderBy = dto.sortBy ?? { createdAt: 'desc' };
    const limit = dto.pageSize ?? PAGINATION.COMMENTS.DEFAULT_ITEMS_PER_PAGE;
    const offset = dto.pageOffset ?? 0;

    const [comments, total] = await Promise.all([
      this.comments.search({ postId: dto.postId, depth: 0 }, orderBy, {
        skip: offset,
        take: limit,
        includeReplies: true,
        maxReplyTreeDepth: dto.maxReplyLevels,
      }) as Promise<CommentWithReplies[]>,
      this.comments.count({ postId: dto.postId, depth: 0 }),
    ]);

    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      items: comments.map((c) => this.setReplyCountRecursively(c)),
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

  async getById(dto: GetCommentDto): Promise<GetCommentResponseDto> {
    dto = await transformAndValidateDto(dto, GetCommentDto);

    await this.validatePostAccess(dto.postId, dto.viewerId);

    const comment = (await this.comments.getById(dto.commentId, {
      includeReplies: true,
      maxReplyTreeDepth: dto.maxReplyLevels,
    })) as CommentWithReplies;

    if (!comment) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    return {
      comment: this.setReplyCountRecursively(comment),
    };
  }

  async create(dto: CreateCommentDto): Promise<Comment> {
    dto = await transformAndValidateDto(dto, CreateCommentDto);

    await this.validatePostAccess(dto.postId, dto.userId);

    let depth = 0;
    if (dto.replyToCommentId) {
      const parentComment = await this.comments.getById(dto.replyToCommentId);
      if (!parentComment || parentComment.postId !== dto.postId) {
        throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
      }
      depth = parentComment.depth + 1;
    }

    if (depth > COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH)
      throw new ApiException(ERROR_CODES.VALIDATION.MAX_REPLY_DEPTH_REACHED);

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
    dto = await transformAndValidateDto(dto, DeleteCommentDto);

    await this.validatePostAccess(dto.postId, dto.authorId);

    const comment = await this.comments.getById(dto.commentId);

    await this.validateCommentAccess(comment, dto.postId, dto.authorId);

    return await this.comments.delete(dto.commentId);
  }

  async update(dto: UpdateCommentDto): Promise<Comment> {
    dto = await transformAndValidateDto(dto, UpdateCommentDto);

    await this.validatePostAccess(dto.postId, dto.userId);

    const commentForUpdate = await this.comments.getById(dto.commentId);

    await this.validateCommentAccess(commentForUpdate, dto.postId, dto.userId);

    return await this.comments.update(dto.commentId, {
      updatedAt: new Date(),
      content: dto.content,
    });
  }

  /**
   * Checks if post exists and that the user is allowed to access content regarding it.
   *
   * **Access control:**
   * - All posts: Admins and Mods have access by default
   * - Members-only posts: Require viewerId to be provided
   * - Private posts: Accessible only if viewerId is the post's author
   *
   * @param postId Post id
   * @param viewerId Id of the user trying to access the post
   */
  private async validatePostAccess(
    postId: number,
    viewerId?: number
  ): Promise<void> {
    const post = await this.posts.getById(postId);
    if (!post) throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);

    if (viewerId) {
      const user = await this.users.getById(viewerId.toString());
      if (!user) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);

      if (user.role === 'ADMIN' || user.role === 'MOD') return;
    }

    if (
      post.status !== 'PUBLISHED' &&
      (!viewerId || viewerId !== post.authorId)
    ) {
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
    }

    if (!viewerId && post.visibility === 'MEMBERS_ONLY') {
      throw new ApiException(ERROR_CODES.AUTH.UNAUTHORIZED);
    }
  }

  /**
   * Checks if comment exists and that the user has access to it.
   *
   * **Access control:**
   * - Author of comment has access by default
   * - Admins and Mods have access too
   *
   * @param comment The comment
   * @param postId Post id
   * @param viewerId Id of the user trying to access the post
   * @returns
   */
  private async validateCommentAccess(
    comment: Comment | null,
    postId: number,
    viewerId: number
  ): Promise<void> {
    if (!comment || comment.postId !== postId) {
      throw new ApiException(ERROR_CODES.SERVER.NOT_FOUND);
    }
    if (viewerId) {
      const user = await this.users.getById(viewerId.toString());
      if (!user) throw new ApiException(ERROR_CODES.VALIDATION.USER_MISSING);
      if (user && (user.role === 'ADMIN' || user.role === 'MOD')) return;
    }

    if (comment.userId !== viewerId)
      throw new ApiException(ERROR_CODES.SERVER.FORBIDDEN);
  }

  private getReplyCountRecursively(comment: CommentWithReplies) {
    let sum = 0;
    comment.replies?.forEach((c) => {
      sum++;
      if (c.replies) sum += this.getReplyCountRecursively(c);
    });
    return sum;
  }
  
  private setReplyCountRecursively(
    comment: CommentWithReplies
  ): CommentWithReplies {
    // Base case: no replies
    if (!comment.replies || comment.replies.length === 0) {
      return {
        ...comment,
        replyCount: 0,
        replies: [],
      };
    }

    const processedReplies = comment.replies.map((reply) =>
      this.setReplyCountRecursively(reply)
    );

    return {
      ...comment,
      replyCount: this.getReplyCountRecursively(comment),
      replies: processedReplies,
    };
  }
}
