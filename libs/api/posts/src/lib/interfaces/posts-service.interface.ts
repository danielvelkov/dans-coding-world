import {
  CreatePostDto,
  DeletePostDto,
  SearchPostsDto,
  UpdatePostDto,
  PostSearchResponseDto,
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
   * @param id The ID of the post to retrieve.
   * @returns A promise that resolves to the matching Post object.
   * @example
   * ```typescript
   * const post = await postsService.getById(42);
   * ```
   * @throws {Error} When the post with this ID is not found (SER002)
   */
  getById(id: number): Promise<Post>;

  /**
   * Retrieves a paginated list of posts based on filtering criteria.
   * Excludes title search.
   * @param dto Data transfer object containing pagination and filter options.
   * @returns A promise that resolves to a paginated response containing posts.
   * @example
   * ```typescript
   * const posts = await postsService.getAll({ limit: 10, page: 1 });
   * ```
   */
  getAll(
    dto: Omit<SearchPostsDto, 'searchQuery'>
  ): Promise<PostSearchResponseDto>;

  /**
   * Creates a new blog post with the provided data.
   * @param dto Data transfer object containing post creation details.
   * @returns A promise that resolves to the newly created Post object.
   * @throws {Error} When authorId does not correlate to an existing user (VAL003)
   * @throws {Error} When authorId correlates to an user who is not an Admin. See {@link Role}. (SER003)
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
   * @param dto Data transfer object containing updated post fields.
   * @returns A promise that resolves to the updated Post object.
   * @throws {Error} When the post with that id and authorId does not exist
   * @throws {Error} When authorId does not correlate to an existing user (VAL003)
   * @throws {Error} When authorId correlates to an user who is not an Admin. See {@link Role}. (SER003)
   * @throws {Error} When post with this title already exists
   * @example
   * ```typescript
   * const updatedPost = await postsService.update({
   *   id: 42,
   *   authorId: user.id,
   *   title: 'Updated Title',
   *   content: 'Updated content...'
   * });
   * ```
   */
  update(dto: UpdatePostDto): Promise<Post>;

  /**
   * Deletes a post by its identifier.
   * @param dto Data transfer object containing the post ID to delete.
   * @returns A promise that resolves to true if deletion was successful.
   * @throws {Error} When the post with that id and authorId does not exist
   * @example
   * ```typescript
   * const success = await postsService.delete({ id: 42, authorId: 1 });
   * ```
   */
  delete(dto: DeletePostDto): Promise<boolean>;

  /**
   * Performs a full-text search across posts using the provided query and filters.
   * @param dto Data transfer object containing search query and pagination options.
   * @returns A promise that resolves to a paginated response of matching posts.
   * @throws {Error} When the pagination options are not set properly
   * @example
   * ```typescript
   * const results = await postsService.search({
   *   searchQuery: 'NX monorepo',
   *   limit: 10,
   *   page: 1
   * });
   * ```
   */
  search(dto: SearchPostsDto): Promise<PostSearchResponseDto>;
}
