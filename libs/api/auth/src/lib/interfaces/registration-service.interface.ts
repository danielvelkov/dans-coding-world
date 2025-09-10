import {
  RegisterDto,
  RegistrationResponseDto,
} from '@dans-coding-world/shared-auth-dto';
/**
 * User registration service which provides:
 * - registration input validation
 * - password hashing using bcrypt
 * - user creation in database
 * @example
 * ```typescript
 * export class RegistrationService implements IRegistrationService {
 *   async register(dto: RegisterDto): Promise<RegistrationResponse> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface IRegistrationService {
  /**
   * Registers an user with the app upon validating provided input.
   * @param dto Account data containing email and password.
   * @returns The created user entry with id.
   * @throws {AppException} When an user with this email already exists.
   * @throws {AppException} When register data validation fails
   * @example
   * ```typescript
   * const { user } = await registrationService.register({
   *    email: 'user123gmail.com',
   *    password: 'user123',
   * });
   * ```
   */
  register(dto: RegisterDto): Promise<RegistrationResponseDto>;
}
