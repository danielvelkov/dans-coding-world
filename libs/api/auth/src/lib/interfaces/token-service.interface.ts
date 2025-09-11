import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
/**
 * Token generation and control service which provides:
 * - generation of user access and refresh tokens
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
   * @param secret Refresh token secret.
   * @param expiresIn Time till expiration in ms.
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

  revokeRefreshToken(token: string): Promise<RefreshToken>;
  revokeAllUserRefreshTokens(userId: string): Promise<RefreshToken[]>;
  revokeAllRefreshTokens(): Promise<RefreshToken[]>;
}

export type TokenOptions = {
  secret: string;
  expiresIn: number;
};
