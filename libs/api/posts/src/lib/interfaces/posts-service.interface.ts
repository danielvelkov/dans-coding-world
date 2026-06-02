import {
  CreatePostDto,
  DeletePostDto,
  UpdatePostDto,
  GetPostsResponseDto,
  GetPostDto,
  GetPostsDto,
  GetPostsMetadataResponse,
} from '@dans-coding-world/shared-post-dto';
import { PostFull } from '@dans-coding-world/post-data-access';

/**
 * Service for managing blog posts.
 *
 * Provides full CRUD operations for posts, including retrieval with filtering,
 * pagination, and search capabilities.
 *
 * @example
 * ```typescript
 * export class PostsService implements IPostsService {
 *   async getById(dto: GetPostDto) {
 *     // Implementation
 *   }
 *   async getAll(dto: GetPostsDto) {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface IPostsService {
  /**
   * Retrieves a single post by its unique identifier.
   *
   * **Access control:**
   * - Public posts: Fully accessible to all users
   * - Members-only posts: Content field hidden when accessed without viewerId
   * - Draft/archived posts: Accessible only to the post author
   * - All posts: Accessible by admins and moderators
   *
   * @param dto - Request parameters including postId and optional viewerId
   * @returns The requested post object
   *
   * @example
   * ```typescript
   * const post = await postsService.getById({ postId: 42, viewerId: 1 });
   * ```
   *
   * @throws {Error} Post not found (SER002)
   * @throws {Error} Unauthorized access to unpublished post (SER003)
   */
  getById(dto: GetPostDto): Promise<PostFull>;

  /**
   * Retrieves a paginated and filterable list of posts.
   *
   * Supports filtering, sorting, pagination, and full-text search across
   * post titles and content.
   *
   * **Filtering options:**
   * - By post status (DRAFT, PUBLISHED, ARCHIVED)
   * - By visibility (PUBLIC, MEMBERS_ONLY)
   * - By tags
   * - By published date year
   * - By userId
   *
   * **Sorting options:**
   * - By creation date (createdAt)
   * - By last modification date (updatedAt)
   * - By publication date (publishedAt)
   *
   * **Access control:**
   * - Members-only posts: Content masked when accessed without viewerId
   * - Draft/archived posts: Visible only to the post author
   * - All posts: Accessible by admins
   *
   * @param dto - Optional request parameters including viewerId, pagination, sorting, filtering, and search query
   * @returns Paginated response containing posts, total count, and pagination metadata
   *
   * @example
   * ```typescript
   * const {items, pagination, count} = await postsService.getAll({ limit: 10, page: 1, viewerId: 1, searchQuery: 'How to'  });
   * ```
   */
  getAll(dto?: GetPostsDto): Promise<GetPostsResponseDto>;

  /**
   * Creates a new blog post.
   *
   * Posts can be created as drafts or published immediately. The publication
   * date is automatically set when a post is first published.
   *
   * @param dto - Post creation data including authorId, title, content, and visibility settings
   * @returns The newly created post object
   *
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
   *
   * @throws {Error} When post data validation fails (VAL001)
   * @throws {Error} Author not found (VAL003)
   * @throws {Error} Post with this title already exists (VAL005)
   */
  create(dto: CreatePostDto): Promise<PostFull>;

  /**
   * Updates an existing post with new data.
   *
   * Automatically updates the `updatedAt` timestamp. When a post status changes
   * to 'PUBLISHED' for the first time, the `publishedAt` timestamp is set to the
   * current date.
   *
   * **Access control:**
   * - The post author can update their own posts.
   * - Updating of posts is also accessible by admins
   *
   * @param dto - Update data including postId, authorId, and fields to modify
   * @returns The updated post object
   *
   * @example
   * ```typescript
   * const updatedPost = await postsService.update({
   *   postId: 42,
   *   authorId: user.id,
   *   title: 'Updated Title',
   *   content: 'Updated content...',
   *   status: 'PUBLISHED'
   * });
   * ```
   *
   * @throws {Error} When new post data validation fails (VAL001)
   * @throws {Error} Post not found or author mismatch (SER002)
   * @throws {Error} Post with this title already exists (VAL005)
   */
  update(dto: UpdatePostDto): Promise<PostFull>;

  /**
   * Permanently deletes a post and all associated data. This action cannot be undone.
   *
   * **Access control:**
   * - The post author can delete their own posts.
   * - Deletion of posts is also accessible by admins
   *
   * @param dto - Deletion parameters including postId and authorId
   * @returns The deleted post object
   *
   * @example
   * ```typescript
   * const deletedPost = await postsService.delete({
   *   postId: 42,
   *   authorId: 1
   * });
   * ```
   *
   * @throws {Error} Post not found (SER002)
   * @throws {Error} Unauthorized deletion attempt - author mismatch (VAL003)
   */
  delete(dto: DeletePostDto): Promise<PostFull>;

  /**
   * Gets posts metadata regarding published posts.
   *
   * @returns The posts metadata like years where posts were published
   *
   * @example
   * ```typescript
   * const { years } = await postsService.getMetadata();
   * ```
   */
  getMetadata(): Promise<GetPostsMetadataResponse>;
}
