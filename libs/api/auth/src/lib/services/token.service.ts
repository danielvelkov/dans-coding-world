import jwt from 'jsonwebtoken';
import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import { ITokenService } from '../interfaces/token-service.interface.js';
import config, { AuthConfiguration } from '../config/auth.config.js';

/**
 * @implements {ITokenService}
 */
export class TokenService implements ITokenService {
  constructor(public authConfig: AuthConfiguration = config) {}

  generateAccessToken(
    payload: object,
    secret: string = this.authConfig.options.accessSecret,
    expiresIn: number = this.authConfig.options.accessExpiration
  ): string {
    return jwt.sign(payload, secret, { expiresIn });
  }

  generateRefreshToken(
    user: User,
    secret: string = this.authConfig.options.refreshSecret,
    expiresIn: number = this.authConfig.options.refreshExpiration
  ): string {
    return jwt.sign({ sub: user.id.toString() }, secret, { expiresIn });
  }

  revokeRefreshToken(token: string): Promise<RefreshToken> {
    throw new Error('Method not implemented.');
  }
  revokeAllUserRefreshTokens(userId: string): Promise<RefreshToken[]> {
    throw new Error('Method not implemented.');
  }
  revokeAllRefreshTokens(): Promise<RefreshToken[]> {
    throw new Error('Method not implemented.');
  }
}

export default new TokenService();
