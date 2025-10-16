import {
  CreatePostDto,
  DeletePostDto,
  UpdatePostDto,
  GetPostsResponseDto,
  GetPostDto,
  GetPostsDto,
} from '@dans-coding-world/shared-post-dto';
import { Post, Role } from '@dans-coding-world/prisma-schema';
/**
 * Service related to CRUD operations on Posts inside the blog
 * @example
 * ```typescript
 * export class PostsService implements IPostsService {
 *  async getById(id:number){
 *    // Implementation
 *  }
 *  // ...
 *  async search(dto: SearchPostsDto){
 *    // Implementation
 *  }
 * }
 */
export interface IPostsService {
  /**
   * Retrieves a single post by its unique identifier.
   * - If no userId is passed and the post is not visible to the public, requesting it hides 'content' field
   * @param dto Data transfer object containing post id and user id (optional).
   * @returns A promise that resolves to the matching Post object.
   * @example
   * ```typescript
   * const post = await postsService.getById({id: 42, userId: 1});
   * ```
   * @throws {Error} When the post with this ID is not found (SER002)
   * @throws {Error} When the user requesting it is not the author and the post is not published (SERV003)
   */
  getById(dto: GetPostDto): Promise<Post>;

  /**
   * Retrieves a paginated list of posts based on filtering, sorting and pagination criteria (if present).
   * @param dto Data transfer object containing viewerId, pagination and filter options.
   * @returns A promise that resolves to a paginated response containing posts.
   * @example
   * ```typescript
   * const {items, pagination, count} = await postsService.getAll({ limit: 10, page: 1 });
   * ```
   */
  getAll(dto?: GetPostsDto): Promise<GetPostsResponseDto>;

  /**
   * Creates a new blog post with the provided data.
   * @param dto Data transfer object containing post creation details.
   * @returns A promise that resolves to the newly created Post object.
   * @throws {Error} When authorId does not correlate to an existing user (VAL003)
   * @throws {Error} When post with this title already exists
   * @example
   * ```typescript
   * const newPost = await postsService.create({
   *   authorId: user.id,
   *   title: 'Understanding Dependency Injection',
   *   content: 'Let’s explore DI in Node.js...',
   *   isDraft: true,
   *   membersOnly: false
   * });
   * ```
   */
  create(dto: CreatePostDto): Promise<Post>;

  /**
   * Updates an existing post with new data.
   *
   * Modifies "updatedAt" field on successful update.
   *
   * Sets 'publishedAt' field to current date when post status
   *  is changed for the first time to 'PUBLISHED'
   * @param dto Data transfer object containing updated post fields.
   * @returns A promise that resolves to the updated Post object.
   * @throws {Error} When the post with that id and authorId does not exist
   * @throws {Error} When post with this title already exists
   * @example
   * ```typescript
   * const updatedPost = await postsService.update({
   *   postId: 42,
   *   userId: user.id,
   *   title: 'Updated Title',
   *   content: 'Updated content...'
   * });
   * ```
   */
  update(dto: UpdatePostDto): Promise<Post>;

  /**
   * Deletes a post by its identifier and author id.
   * @param dto Data transfer object containing the post ID to delete.
   * @returns A promise that resolves to the deleted post.
   * @throws {Error} When the post with that id and authorId does not exist
   * @example
   * ```typescript
   *  await postsService.delete({ id: 42, authorId: 1 });
   * ```
   */
  delete(dto: DeletePostDto): Promise<Post>;
}
