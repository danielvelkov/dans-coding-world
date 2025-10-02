import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import { JwtPayload } from 'jsonwebtoken';
/**
 * Token generation and control service which provides:
 * - generation of user access and refresh tokens
 * - verification of jwt tokens
 * - revocation of user refresh tokens
 * @example
 * ```typescript
 * export class TokenService implements ITokenService {
 *   async generateAccessToken(payload: unknown, options?: TokenOptions): Promise<string> {
 *     // Implementation
 *   }
 *   // ...
 *   async revokeRefreshToken(token:string): Promise<RefreshToken> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface ITokenService {
  /**
   * Generates user access tokens for JWT short-term authentication.
   * @param payload The token payload data. Could be anything.
   * @param options Token related options like secret, time till expiration, etc.
   * @returns The generated token as string.
   * @example
   * ```typescript
   * const accessToken = await tokenService.generateAccessToken(
   *    {sub:user.id, user},
   *    {
   *      secret:ACCESS_TOKEN_SECRET,
   *      expiresIn: 1000 * 60 * 15 // 15 mins
   *    }
   * );
   * ```
   */
  generateAccessToken(payload: unknown, options?: TokenOptions): string;

  /**
   * Generates user refresh token for JWT long-term authentication.
   * @param user User object containing id
   * @param options Token related options like secret, time till expiration, etc.
   * @returns The generated token as string.
   * @example
   * ```typescript
   * const refreshToken = await tokenService.generateRefreshToken(
   *    user.id,
   *    {
   *      secret:REFRESH_TOKEN_SECRET,
   *      expiresIn: 1000 * 60 * 60 * 24 * 30 // 1 month
   *    }
   * );
   * ```
   */
  generateRefreshToken(user: User, options?: TokenOptions): string;
  /**
   * Verify token and return its payload.
   * @param token User token.
   * @param options Token related options like secret, time till expiration, etc.
   * @returns The verified token's payload
   * @throws {Error} An error when the token is invalid or expired
   * @example
   * ```typescript
   * const payload = await tokenService.verifyRefreshToken(
   *    token,
   *    {
   *      secret:REFRESH_TOKEN_SECRET,
   *    }
   * );
   * ```
   */
  verifyRefreshToken(token: string, options?: TokenOptions): JwtPayload;

  /**
   * Mark specific refresh token as revoked.
   * @param token Refresh token
   * @returns The revoked token
   * @throws {Error} An error when the token does not exist. (SER002)
   * @example
   * ```typescript
   * const payload = await tokenService.revokeRefreshToken(
   *    token,
   * );
   * ```
   */
  revokeRefreshToken(token: string): Promise<RefreshToken>;

  /**
   * Mark all user refresh token as revoked.
   * @param userId User id.
   * @returns The number of revoked tokens, if any
   * @example
   * ```typescript
   * const count = await tokenService.revokeAllUserRefreshTokens(
   *    token,
   * );
   * ```
   */
  revokeAllUserRefreshTokens(userId: string): Promise<number>;

  /**
   * Mark ALL refresh token as revoked.
   * @description Admin-only operation. Requires elevated privileges.
   * @returns The number of revoked tokens, if any
   * @example
   * ```typescript
   * const count = await tokenService.revokeAllRefreshTokens(
   *    token,
   * );
   * ```
   */
  revokeAllRefreshTokens(): Promise<number>;
}

export type TokenOptions = {
  secret: string;
  expiresIn: number;
};
