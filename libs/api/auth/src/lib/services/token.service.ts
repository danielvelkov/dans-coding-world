import { Injectable, Inject } from 'injection-js';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import {
  ITokenService,
  TokenOptions,
} from '../interfaces/token-service.interface.js';
import type { AuthConfiguration } from '../config/auth.config.js';
import type { IRefreshTokenRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { ApiException } from '@dans-coding-world/exceptions';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';

export const AUTH_CONFIG_TOKEN = 'AuthConfiguration';
export const TOKEN_SERVICE_TOKEN = 'ITokenService';
export const REFRESH_TOKEN_REPOSITORY_TOKEN = 'IRefreshTokenRepository';

/**
 * @implements {ITokenService}
 */
@Injectable()
export class TokenService implements ITokenService {
  constructor(
    @Inject(AUTH_CONFIG_TOKEN)
    private authConfig: AuthConfiguration,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private refreshTokens: IRefreshTokenRepository
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

  async revokeRefreshToken(token: string): Promise<RefreshToken> {
    let payload: JwtPayload;
    try {
      payload = this.verifyRefreshToken(token);
    } catch (_) {
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);
    }

    const { jti } = payload;
    if (!jti) throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);

    const refreshToken = await this.refreshTokens.getById(jti);
    if (!refreshToken) throw new ApiException(ERROR_CODES.AUTH.TOKEN_NOT_FOUND);

    if (refreshToken.revoked) {
      return refreshToken;
    }

    refreshToken.revoked = true;
    return await this.refreshTokens.update(refreshToken.jti, refreshToken);
  }
  async revokeAllUserRefreshTokens(userId: string): Promise<number> {
    return await this.refreshTokens.updateMany(
      { userId: +userId, revoked: false },
      { revoked: true }
    );
  }
  async revokeAllRefreshTokens(): Promise<number> {
    return await this.refreshTokens.updateMany(
      { revoked: false },
      { revoked: true }
    );
  }
}
