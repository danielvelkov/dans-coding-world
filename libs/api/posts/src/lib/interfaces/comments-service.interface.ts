import { Comment } from '@dans-coding-world/prisma-schema';
import {
  GetPostCommentRepliesDto,
  GetPostCommentsDto,
  GetPostCommentsResponseDto,
  GetPostCommentRepliesResponseDto,
  CreateCommentDto,
  DeleteCommentDto,
  UpdateCommentDto,
} from '@dans-coding-world/shared-post-dto';
/**
 * Service related to CRUD operations for user comments on posts
 *
 * @example
 * ```typescript
 * class CommentsService implements ICommentsService {
 *  async getPostComments(dto: GetPostCommentsDto) {
 *  // implementation
 *  }
 *  async create(dto: CreateCommentDto) {
 *  // implementation
 *  }
 * }
 * ```
 */
export interface ICommentsService {
  /**
   * Retrieves top-level comments for a post with pagination and sorting options.
   * @param dto Contains postId, viewerId (optional), and pagination and sorting params (optional).
   * @returns A promise that resolves to a paginated list of direct comments to post.
   * @example
   * ```typescript
   * const {items, count, pagination} = await commentsService.getPostComments({
   *   postId: 1,
   *   viewerId: 1,
   *   pageSize: 20,
   *   pageOffset: 0
   * });
   * ```
   * @throws {Error} When the post with this postId is not found (SER002)
   * @throws {Error} When the viewerId is not provided and the post, where the comment is posted, is for MEMBERS-ONLY (SER003)
   * @throws {Error} When the post is not PUBLISHED (SER003)
   */
  getPostComments(dto: GetPostCommentsDto): Promise<GetPostCommentsResponseDto>;

  /**
   * Retrieves direct replies to a comment, including the parent comment where the thread began.
   * @param dto Contains commentId, postId, and viewerId (optional).
   * @returns Direct replies under the specified comment (only 1 depth level deep).
   * @throws {Error} When the post with this postId is not found (SER002)
   * @throws {Error} When the thread parent comment id is not found on the post (SER002)
   * @throws {Error} When the viewerId is not provided and the post, where the comment is posted, is for MEMBERS-ONLY (SER003)
   * @throws {Error} When the post is not PUBLISHED (SER003)
   */
  getCommentReplies(
    dto: GetPostCommentRepliesDto
  ): Promise<GetPostCommentRepliesResponseDto>;

  /**
   * Creates a comment for a post. Could also be a reply to another comment on that post.
   * @param dto Data transfer object containing content, post id, user id and replyTo comment id (optional).
   * @returns A promise that resolves to the matching Comment object.
   * @example
   * ```typescript
   * const comment = await commentsService.create({postId: 42, userId: 1, content: 'I Like Trains'});
   * ```
   * @throws {Error} When the post with this postId is not found (SER002)
   * @throws {Error} When the replyTo comment id is not found on the post (SER002)
   * @throws {Error} When the post is not PUBLISHED (SER003)
   */
  create(dto: CreateCommentDto): Promise<Comment>;

  /**
   * Deletes a comment and all its related replies from a post.
   * @param dto Data transfer object containing comment id, post id and author id.
   * @returns A promise that resolves to the deleted Comment object.
   * @example
   * ```typescript
   * const comment = await commentsService.delete({id: 1, postId: 42, authorId: 1 });
   * ```
   * @throws {Error} When the comment for that post is not found (SER002)
   * @throws {Error} When the authorId doesn't match the comment's author id (VAL003)
   * @throws {Error} When the post is not PUBLISHED (SER003)
   */
  delete(dto: DeleteCommentDto): Promise<Comment>;
  /**
   * Updates a comment's contents.
   * @param dto Data transfer object containing comment id, post id and author id.
   * @returns A promise that resolves to the updated Comment object.
   * @example
   * ```typescript
   * const comment = await commentsService.update({id: 1, postId: 42, authorId: 1 });
   * ```
   * @throws {Error} When the comment for that post is not found (SER002)
   * @throws {Error} When the authorId doesn't match the comment's author id (VAL003)
   * @throws {Error} When the post is not PUBLISHED (SER003)
   */
  update(dto: UpdateCommentDto): Promise<Comment>;
}
