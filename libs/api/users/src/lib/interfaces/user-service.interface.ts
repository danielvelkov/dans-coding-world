import type { User } from '@dans-coding-world/prisma-schema';
import {
  DeleteUserDto,
  ChangePasswordDto,
  GetUserDto,
  UpdateUserDto,
  ChangeRoleDto,
  ChangeBanStatusDto,
  GetUserResponseDto,
  GetUsersDto,
  GetUsersResponseDto,
} from '@dans-coding-world/shared-user-dto';
/**
 * Service for user related actions.
 *
 * Provides account update and deletion methods, password change and other methods.
 *
 * @example
 * ```typescript
 * export class UserService implements IUserService {
 *   async update(dto: UpdateUserDto) {
 *     // Implementation
 *   }
 *   async delete(dto: DeleteUserDto) {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface IUserService {
  /**
   * Retrieves a paginated and filterable list of users.
   *
   * Supports filtering, sorting, pagination, and text search by username
   *
   * **Filtering options:**
   * - By role (MOD, ADMIN, USER, AUTHOR)
   * - By isBanned status
   *
   * **Sorting options:**
   * - By username (asc: A-Z, desc: Z-A)
   *
   * @param dto - Optional request parameters including  pagination, sorting, filtering, and search query
   * @returns Paginated response containing users, total count, and pagination metadata
   *
   * @example
   * ```typescript
   * const {items, pagination, count} = await userService.getAll({ limit: 10, page: 1, viewerId: 1, searchQuery: 'user12'  });
   * ```
   */
  getAll(dto?: GetUsersDto): Promise<GetUsersResponseDto>;

  /**
   * Retrieves a user by its unique identifier along with its profile data.
   *
   * **Access control:**
   * - Users who query other users do not have access to private fields like email
   * - ADMINS and MODS have access to email
   *
   * @param dto - Request parameters including userId and viewerId (optional)
   * @returns The response dto with user object and profile details
   *
   * @example
   * ```typescript
   * const { user } = await userService.getById({ userId: 42, viewerId: 1 });
   * ```
   *
   * @throws {Error} User not found (SER002)
   */
  getById(dto: GetUserDto): Promise<GetUserResponseDto>;

  /**
   * Used to change non-sensitive details like avatar img or first name, last name, bio etc.
   * If user has no profile details set yet, the method also creates the profile relation
   *
   * @param dto - Update data including userId and fields to modify
   * @returns The response dto with updated user object and profile details
   *
   * @example
   * ```typescript
   * const { user } = await userService.update({
   *   userId: 42,
   *   firstName: Bang
   * });
   * ```
   *
   * @throws {Error} New user data failed validation (VAL001)
   * @throws {Error} User not found (SER002)
   */
  update(dto: UpdateUserDto): Promise<GetUserResponseDto>;

  /**
   * Change user password provided that the old password matches the current one.
   *
   * @param dto - Update data including userId, oldPassword and newPassword
   * @returns The user object
   *
   * @example
   * ```typescript
   * const updatedUser = await userService.changePassword({
   *   userId: 42,
   *   oldPassword: pa55word,
   *   newPassword: l3j2lk9js0j23
   * });
   * ```
   *
   * @throws {Error} Old password is wrong. (AUTH001)
   * @throws {Error} New password matches old one. (AUTH006)
   * @throws {Error} User not found (SER002)
   */
  changePassword(dto: ChangePasswordDto): Promise<User>;

  /**
   * Change user's role.
   *
   * - Admins can't change the role of another admin.
   * - can't promote any user to role of ADMIN
   *
   * @description Admin-only operation. Requires elevated privileges.
   *
   * @param dto - Update data including userId and role
   * @returns The user object with the updated role
   *
   * @example
   * ```typescript
   * const userPromotedToMod = await userService.changeRole({
   *   userId: 42,
   *   role: MOD
   * });
   * ```
   *
   * @throws {Error} When new role matches old one. (VAL001)
   * @throws {Error} When trying to change an ADMIN's role. (SEC001)
   * @throws {Error} When trying to change user to ADMIN role. (SEC004)
   * @throws {Error} User not found (SER002)
   */
  changeRole(dto: ChangeRoleDto): Promise<User>;

  /**
   * Change user "banned" status. Users can't change their own ban status
   *
   * - Mods can't ban other mods
   * - ADMINS can't be banned
   *
   * @description Admin or Moderator-only operation. Requires elevated privileges.
   *
   * @param dto - Update data including userId, isBanned and userToChangeId
   * @returns The user object with the updated ban status
   *
   * @example
   * ```typescript
   * const bannedUser = await userService.changeBanStatus({
   *   userId: 42,
   *   userToChangeId: 23,
   *   isBanned: true
   * });
   * ```
   *
   * @throws {Error} User not found (SER002)
   * @throws {Error} When trying to ban an ADMIN. (SEC001)
   * @throws {Error} When a MOD is trying to ban another MOD. (SEC002)
   * @throws {Error} When User is trying to ban himself. (SEC003)
   */
  changeBanStatus(dto: ChangeBanStatusDto): Promise<User>;

  /**
   * Permanently removes an user record and all related data - posts, comments, reports , etc.
   *
   * **Access control:**
   * - If the requesting user is the same as the user to be deleted
   * - Deletion of specific users is also accessible to admins
   * - Admins can't delete another admin
   *
   * @param dto - Deletion parameters including userId and userToDeleteId
   * @returns The deleted user object
   *
   * @example
   * ```typescript
   * const deletedUser = await userService.delete({
   *   userId: 42,
   *   userToDeleteId: 1
   * });
   * ```
   *
   * @throws {Error} User not found (SER002)
   * @throws {Error} Unauthorized deletion attempt (SER003)
   * @throws {Error} When trying to delete an admin (SEC001)
   */
  delete(dto: DeleteUserDto): Promise<User>;
}
