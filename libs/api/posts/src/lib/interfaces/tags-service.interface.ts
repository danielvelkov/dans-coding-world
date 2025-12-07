import { Tag } from '@dans-coding-world/prisma-schema';
import {
  CreateTagDto,
  UpdateTagDto,
  GetTagsDto,
  GetTagsResponse,
  DeleteTagDto,
  GetTagDto,
} from '@dans-coding-world/shared-post-dto';

/**
 * Service for managing tags for posts.
 *
 * Provides full CRUD operations for tags, including retrieval,
 * creation, updates, and deletions.
 *
 * @example
 * ```typescript
 * class TagsService implements ITagsService {
 *   async getById(dto: GetTagDto) {
 *     // implementation
 *    }
 *   async create(dto: CreateTagDto) {
 *     // implementation
 *   }
 * }
 * ```
 */
export interface ITagsService {
  /**
   * Retrieves a tag by its unique identifier.
   *
   * @param dto - Parameters like the tag id
   * @returns The requested tag object
   *
   * @example
   * ```typescript
   * const tag = await tagsService.getById({tagId: 1});
   * ```
   *
   * @throws {Error} Tag not found (SER002)
   */
  getById(dto: GetTagDto): Promise<Tag>;

  /**
   * Retrieves a list of tags used in PUBLISHED posts.
   * If viewerId is specified, it also includes tags have been used in
   * private posts that are available only for the user.
   *
   * @param dto - Optional request parameters including viewerId.
   * @returns Paginated response containing tags and their count
   *
   * @example
   * ```typescript
   * const {items, count} = await tagsService.getAll();
   * ```
   */
  getAll(dto?: GetTagsDto): Promise<GetTagsResponse>;
  /**
   * Creates a new tag.
   *
   * @param dto - Tag data including name
   * @returns The newly created tag
   *
   * @example
   * ```typescript
   * const tag = await tagsService.create({name: 'tech'});
   * ```
   * @throws {Error} When tag name fails validation (VAL001)
   * @throws {Error} When a tag with that name already exists (VAL004)
   */
  create(dto: CreateTagDto): Promise<Tag>;

  /**
   * Deletes a tag.
   *
   * @param dto - Parameters like the tag id
   * @returns The deleted tag object
   *
   * @example
   * ```typescript
   * const deletedTag = await tagsService.delete({tagId: 1});
   * ```
   *
   * @throws {Error} Tag not found (SER002)
   */
  delete(dto: DeleteTagDto): Promise<Tag>;

  /**
   * Updates the name of an existing tag.
   *
   * @param dto - Update parameters including tagId and new name
   * @returns The updated Tag object
   *
   * @example
   * ```typescript
   * const updatedTag = await tagsService.update({
   *   tagId: 1,
   *   name: 'tech'
   * });
   * ```
   *
   * @throws {Error} When tag name fails validation (VAL001)
   * @throws {Error} Tag not found (SER002)
   * @throws {Error} When a tag with that name already exists (VAL004)
   */
  update(dto: UpdateTagDto): Promise<Tag>;
}
