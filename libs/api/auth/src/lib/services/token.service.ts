import { Injectable, Inject } from 'injection-js';
import jwt from 'jsonwebtoken';
import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import {
  ITokenService,
  TokenOptions,
} from '../interfaces/token-service.interface.js';
import type { AuthConfiguration } from '../config/auth.config.js';

export const AUTH_CONFIG_TOKEN = 'AuthConfiguration';
export const TOKEN_SERVICE_TOKEN = 'ITokenService';

/**
 * @implements {ITokenService}
 */
@Injectable()
export class TokenService implements ITokenService {
  constructor(
    @Inject(AUTH_CONFIG_TOKEN)
    private authConfig: AuthConfiguration
  ) {}

  generateAccessToken(
    payload: object,
    options: TokenOptions = {
      secret: this.authConfig.options.accessSecret,
      expiresIn: this.authConfig.options.accessExpiration,
    }
  ): string {
    return jwt.sign(payload, options.secret, {
      expiresIn: options.expiresIn,
      jwtid: crypto.randomUUID(),
    });
  }

  generateRefreshToken(
    user: User,
    options: TokenOptions = {
      secret: this.authConfig.options.refreshSecret,
      expiresIn: this.authConfig.options.refreshExpiration,
    }
  ): string {
    return jwt.sign(user, options.secret, {
      expiresIn: options.expiresIn,
      jwtid: crypto.randomUUID(),
      subject: user.id.toString(),
    });
  }

  verifyRefreshToken(
    token: string,
    options: TokenOptions = {
      secret: this.authConfig.options.refreshSecret,
      expiresIn: this.authConfig.options.refreshExpiration,
    }
  ) {
    return jwt.verify(token, options.secret) as jwt.JwtPayload;
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
