import jwt from 'jsonwebtoken';
import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import {
  ITokenService,
  TokenOptions,
} from '../interfaces/token-service.interface.js';
import config, { AuthConfiguration } from '../config/auth.config.js';

/**
 * @implements {ITokenService}
 */
export class TokenService implements ITokenService {
  constructor(private authConfig: AuthConfiguration = config) {}

  generateAccessToken(
    payload: object,
    options: TokenOptions = {
      secret: this.authConfig.options.accessSecret,
      expiresIn: this.authConfig.options.accessExpiration,
    }
  ): string {
    return jwt.sign(payload, options.secret, { expiresIn: options.expiresIn });
  }

  generateRefreshToken(
    user: User,
    options: TokenOptions = {
      secret: this.authConfig.options.refreshSecret,
      expiresIn: this.authConfig.options.refreshExpiration,
    }
  ): string {
    return jwt.sign({ sub: user.id.toString() }, options.secret, {
      expiresIn: options.expiresIn,
    });
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
