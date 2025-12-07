import { User } from '@dans-coding-world/prisma-schema';
import {
  DeleteUserDto,
  ChangePasswordDto,
  GetUserDto,
  UpdateUserDto,
} from '@dans-coding-world/shared-user-dto';
/**
 * Service for user related actions.
 *
 * Provides account update and deletion methods, password reset, email change and other methods.
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
   * Retrieves a user by its unique identifier.
   *
   * @param dto - Request parameters including userId
   * @returns The requested user object
   *
   * @example
   * ```typescript
   * const user = await userService.getById({ userId: 42 });
   * ```
   *
   * @throws {Error} User not found (SER002)
   */
  getById(dto: GetUserDto): Promise<User>;

  /**
   * Used to change non-sensitive details like avatar img or first name, last name, bio etc.
   *
   * @param dto - Update data including userId and fields to modify
   * @returns The updated user object
   *
   * @example
   * ```typescript
   * const updatedUser = await userService.update({
   *   userId: 42,
   *   firstName: Bang
   * });
   * ```
   *
   * @throws {Error} New user data failed validation (VAL001)
   * @throws {Error} User not found (SER002)
   */
  update(dto: UpdateUserDto): Promise<User>;

  /**
   * Change user password provided that the passed old password matches the current one.
   *
   * @param dto - Update data including userId, oldPassword and newPassword
   * @returns The user object with the updated pass
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
   * @throws {Error} New password matches old one. (VAL001)
   * @throws {Error} User not found (SER002)
   */
  changePassword(dto: ChangePasswordDto): Promise<User>;

  /**
   * Permanently removes an user record and all related data - posts, comments, reports , etc.
   *
   * **Access control:**
   * - The owner of the account
   * - Deletion of users is also accessible to admins
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
   * @throws {Error} Unauthorized deletion attempt (VAL003)
   */
  delete(dto: DeleteUserDto): Promise<User>;
}
