import type { Comment } from '@dans-coding-world/prisma-schema';
import {
  GetCommentDto,
  GetPostCommentsDto,
  GetPostCommentsResponseDto,
  GetCommentResponseDto,
  CreateCommentDto,
  DeleteCommentDto,
  UpdateCommentDto,
} from '@dans-coding-world/shared-post-dto';

/**
 * Service for managing comments and replies on posts.
 *
 * Provides full CRUD operations for comments, including retrieval with pagination,
 * creation of comments and replies, updates, and deletions.
 *
 * @example
 * ```typescript
 * class CommentsService implements ICommentsService {
 *   async getPostComments(dto: GetPostCommentsDto) {
 *     // implementation
 *   }
 *   async create(dto: CreateCommentDto) {
 *     // implementation
 *   }
 * }
 * ```
 */
export interface ICommentsService {
  /**
   * Retrieves paginated top-level comments for a post.
   *
   * Comments come with their replies and total reply count.
   * The top-level comments can also be sorted by creation or modification date.
   *
   * Reply nesting can be limited by specifying the maxReplyLevels (1-3)
   * Replies deeper than the specified level are excluded from the response.
   *
   * **Access control:**
   * - Draft and archived post comments: Visible only to the post author
   * - Members-only posts: Require viewerId to be provided
   * - Published posts: Publicly accessible
   * - All posts: Accessible by mods and admins
   *
   * @param dto Contains postId, viewerId (optional), maxReplyLevels(optional), pagination and sorting params (optional).
   * @returns A promise that resolves to a paginated list of top-level comments to post.
   * @example
   * ```typescript
   * const { items, count, pagination } = await commentsService.getPostComments({
   *   postId: 1,
   *   viewerId: 1,
   *   pageSize: 20,
   *   pageOffset: 0,
   *   maxReplyLevels: 2
   * });
   * ```
   *
   * @throws {Error} Post not found (SER002)
   * @throws {Error} Members-only post accessed without viewerId (AUTH005)
   * @throws {Error} Post is not published (SER003)
   */
  getPostComments(dto: GetPostCommentsDto): Promise<GetPostCommentsResponseDto>;

  /**
   * Returns the specified comment with all its replies by its id.
   *
   * Reply nesting can be limited by specifying the maxReplyLevels (1-3)
   * Replies deeper than the specified level are excluded from the response.
   *
   * @param dto - Request parameters including commentId, postId, and optional viewerId and maxReplyLevels
   * @returns Requested comment and its replies
   *
   * @throws {Error} Post not found (SER002)
   * @throws {Error} Parent comment not found on the specified post (SER002)
   * @throws {Error} Members-only post accessed without viewerId (AUTH005)
   * @throws {Error} Post is not published (SER003)
   */
  getById(dto: GetCommentDto): Promise<GetCommentResponseDto>;

  /**
   * Creates a new comment on a post or reply to an existing comment.
   *
   * Supports both top-level comments and threaded replies by optionally
   * specifying a parent comment to reply to.
   *
   * @param dto - Comment data including content, postId, userId, and optional replyTo commentId
   * @returns The newly created comment
   *
   * @example
   * ```typescript
   * const comment = await commentsService.create({postId: 42, userId: 1, content: 'I Like Trains'});
   * ```
   * @throws {Error} When comment data validation fails (VAL001)
   * @throws {Error} When the post with this postId is not found (SER002)
   * @throws {Error} When the replyTo comment id is not found on the post (SER002)
   * @throws {Error} When the post is not PUBLISHED (SER003)
   */
  create(dto: CreateCommentDto): Promise<Comment>;

  /**
   * Deletes a comment and all of its replies.
   *
   * **Access control:**
   * - The comment author can delete their own comments.
   * - Deletion of comments is also accessible by admins and mods
   *
   * @param dto - Deletion parameters including commentId, postId, and authorId
   * @returns The deleted comment object
   *
   * @example
   * ```typescript
   * const deletedComment = await commentsService.delete({
   *   commentId: 1,
   *   postId: 42,
   *   authorId: 1
   * });
   * ```
   *
   * @throws {Error} Comment not found on the specified post (SER002)
   * @throws {Error} Unauthorized deletion attempt - authorId mismatch (VAL003)
   * @throws {Error} Post is not published (SER003)
   */
  delete(dto: DeleteCommentDto): Promise<Comment>;

  /**
   * Updates the content of an existing comment. The modification
   * timestamp is automatically updated.
   *
   * **Access control:**
   * - The comment author can update their own comments.
   * - Update of comments is also accessible by admins and mods
   *
   * @param dto - Update parameters including commentId, postId, authorId, and new content
   * @returns The updated comment object
   *
   * @example
   * ```typescript
   * const updatedComment = await commentsService.update({
   *   id: 1,
   *   postId: 42,
   *   authorId: 1,
   *   content: 'Updated comment text'
   * });
   * ```
   *
   * @throws {Error} Comment not found on the specified post (SER002)
   * @throws {Error} Unauthorized update attempt - authorId mismatch (VAL003)
   * @throws {Error} Post is not published (SER003)
   */
  update(dto: UpdateCommentDto): Promise<Comment>;
}
