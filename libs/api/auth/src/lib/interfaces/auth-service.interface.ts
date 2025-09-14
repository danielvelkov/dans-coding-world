import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
/**
 * User authentication service which provides:
 * - user credentials validation
 * - JWT authentication with access+response tokens
 * - extending of user session by refreshing access token
 * @example
 * ```typescript
 * export class AuthService implements IAuthService {
 *   async login(dto: LoginDto): Promise<LoginResponseDto> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface IAuthService {
  /**
   * Authenticates an user with email and password credentials.
   * Generates access and refresh tokens upon successful authentication.
   * @param dto Login credentials, containing email and password.
   * @returns Authentication response with access and refresh tokens, alongside user data
   * @throws {AppException} When no such user with this email exists (AUTH001)
   * @throws {AppException} When password does not match email credential (AUTH002)
   * @example
   * ```typescript
   * const { accessToken, refreshToken, user } = await authService.login({
   *    username: 'user123gmail.com',
   *    password: 'user123',
   * });
   * ```
   */
  login(dto: LoginDto): Promise<LoginResponseDto>;

  /**
   * Reauthenticate an user by providing valid refresh token.
   * After invalidating the old token, returns new access and refresh tokens .
   * @param refreshToken User refresh token.
   * @param userId User Id.
   * @returns Authentication response with access and refresh tokens, alongside user data
   * @throws {AppException} When refresh token is invalid, expired or revoked (AUTH003).
   * @example
   * ```typescript
   * const { accessToken, refreshToken, user } = await authService.login({
   *    username: 'user123gmail.com',
   *    password: 'user123',
   * });
   * ```
   */
  refreshToken(refreshToken: string, userId: string): Promise<LoginResponseDto>;
}
