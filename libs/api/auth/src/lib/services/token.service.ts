import jwt from 'jsonwebtoken';
import { RefreshToken } from '@dans-coding-world/prisma-schema';
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
    return jwt.sign(payload, secret, { expiresIn: expiresIn });
  }

  async generateRefreshToken(
    sub: string,
    secret: string = this.authConfig.options.refreshSecret,
    expiresIn: number = this.authConfig.options.refreshExpiration
  ): Promise<string> {
    return jwt.sign({ sub }, secret, { expiresIn: expiresIn });
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
