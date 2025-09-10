import { RefreshToken } from '@dans-coding-world/prisma-schema';
/**
 * Token generation and control service which provides:
 * - generation of user access and refresh tokens
 * - revocation of user refresh tokens
 * @example
 * ```typescript
 * export class TokenService implements ITokenService {
 *   async generateAccessToken(payload: unknown, secret: string, expiresIn:number): Promise<string> {
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
   * @param payload The JWT token payload data. Could be anything.
   * @param secret Access token secret.
   * @param expiresIn Time till expiration in ms.
   * @returns The generated token as string.
   * @example
   * ```typescript
   * const accessToken = await tokenService.generateAccessToken(
   *    {sub:user.id, user},
   *    ACCESS_TOKEN_SECRET,
   *    1000 * 60 * 15 // 15 mins
   * );
   * ```
   */
  generateAccessToken(
    payload: unknown,
    secret: string,
    expiresIn: number
  ): string;

  /**
   * Generates user refresh token for JWT long-term authentication.
   * @param sub Subject id (User id)
   * @param secret Refresh token secret.
   * @param expiresIn Time till expiration in ms.
   * @returns The generated token as string.
   * @example
   * ```typescript
   * const refreshToken = await tokenService.generateRefreshToken(
   *    user.id,
   *    REFRESH_TOKEN_SECRET,
   *    1000 * 60 * 60 * 24 * 30 // 1 month
   * );
   * ```
   */
  generateRefreshToken(
    sub: string,
    secret: string,
    expiresIn: number
  ): Promise<string>;

  revokeRefreshToken(token: string): Promise<RefreshToken>;
  revokeAllUserRefreshTokens(userId: string): Promise<RefreshToken[]>;
  revokeAllRefreshTokens(): Promise<RefreshToken[]>;
}
