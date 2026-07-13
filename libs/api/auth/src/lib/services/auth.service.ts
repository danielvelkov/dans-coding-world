import { IAuthService } from '../interfaces/auth-service.interface.js';
import type { ITokenService } from '../interfaces/token-service.interface.js';
import type {
  IRefreshTokenRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import {
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
} from '@dans-coding-world/shared-auth-dto';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { ApiException } from '@dans-coding-world/exceptions';
import { validPassword } from '@dans-coding-world/helpers';
import { Inject, Injectable } from 'injection-js';
import type { AuthConfiguration } from '../config/auth.config.js';
import type { RefreshToken, User } from '@dans-coding-world/prisma-schema';
import {
  AUTH_CONFIG_TOKEN,
  TOKEN_SERVICE_TOKEN,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from './token.service.js';
import { transformAndValidateDto } from '@dans-coding-world/validation';

export const USER_REPOSITORY_TOKEN = 'IUserRepository';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(TOKEN_SERVICE_TOKEN)
    public tokenService: ITokenService,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    public refreshTokens: IRefreshTokenRepository,
    @Inject(AUTH_CONFIG_TOKEN)
    private authConfig: AuthConfiguration,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    await transformAndValidateDto(dto, LoginDto);
    const { email, password } = dto;
    const user = await this.users.get({ email });

    if (!user) throw new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);

    const isPasswordValid = await validPassword(password, user.password);

    if (!isPasswordValid)
      throw new ApiException(ERROR_CODES.AUTH.INVALID_PASSWORD);

    return this.generateLoginResponse(user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<LoginResponseDto> {
    await transformAndValidateDto(dto, RefreshTokenDto);
    const refreshToken = await this.validateAndGetRefreshToken(dto.token);

    // Clean up the old refresh token
    await this.refreshTokens.delete(refreshToken.jti);

    const user = await this.users.getById(refreshToken.userId.toString());
    if (!user) {
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);
    }

    return await this.generateLoginResponse(user);
  }

  private async generateLoginResponse(user: User): Promise<LoginResponseDto> {
    const payload = { sub: user.id };
    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    await this.storeUserRefreshToken(refreshToken, user.id.toString());

    const { password: _, ...userWithoutPass } = user;

    return {
      accessToken,
      refreshToken,
      user: userWithoutPass,
    };
  }

  private async storeUserRefreshToken(
    token: string,
    userId: string,
  ): Promise<void> {
    const { jti } = this.tokenService.verifyRefreshToken(token);

    if (!jti) throw new ApiException(ERROR_CODES.SERVER.INTERNAL_ERROR);

    const expiresAt = new Date(
      Date.now() + this.authConfig.options.refreshExpiration,
    );
    await this.refreshTokens.create(jti, userId, expiresAt);
  }

  private async validateAndGetRefreshToken(
    token: string,
  ): Promise<RefreshToken> {
    let payload;
    try {
      payload = this.tokenService.verifyRefreshToken(token);
    } catch (_) {
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);
    }
    const { jti, sub: userId } = payload;

    if (!userId || !jti) {
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);
    }

    const refreshToken = await this.refreshTokens.getById(jti);
    if (!refreshToken || refreshToken.userId !== +userId)
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);

    this.validateRefreshTokenState(refreshToken);
    return refreshToken;
  }

  private validateRefreshTokenState(refreshToken: RefreshToken): void {
    const now = new Date();

    if (refreshToken.revoked) {
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);
    }

    if (refreshToken.expiresAt < now) {
      throw new ApiException(ERROR_CODES.AUTH.INVALID_TOKEN);
    }
  }
}
