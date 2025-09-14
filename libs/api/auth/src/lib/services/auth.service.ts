import { IAuthService } from '../interfaces/auth-service.interface.js';
import type { ITokenService } from '../interfaces/token-service.interface.js';
import type {
  IRefreshTokenRepository,
  IUserRepository,
} from '@dans-coding-world/shared-data-access-interfaces';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { ApiException } from '@dans-coding-world/exceptions';
import { validPassword, hashPassword } from '../helper/password.helper.js';
import { Inject, Injectable } from 'injection-js';
import type { AuthConfiguration } from '../config/auth.config.js';

export const AUTH_CONFIG_TOKEN = 'AuthConfiguration';
export const TOKEN_SERVICE_TOKEN = 'ITokenService';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';
export const REFRESH_TOKEN_REPOSITORY_TOKEN = 'IRefreshTokenRepository';

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
    private authConfig: AuthConfiguration
  ) {}
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = dto;
    const user = await this.users.get({ email });

    if (!user) throw new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);

    const isPasswordValid = await validPassword(password, user.password);

    if (!isPasswordValid)
      throw new ApiException(ERROR_CODES.AUTH.INVALID_PASSWORD);

    const payload = { sub: user.id };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    await this.storeUserRefreshToken(
      await hashPassword(refreshToken),
      user.id.toString()
    );

    const { password: _, ...userWithoutPass } = user;

    return { accessToken, refreshToken, user: userWithoutPass };
  }

  async refreshToken(
    refreshToken: string,
    userId: string
  ): Promise<LoginResponseDto> {
    throw new Error('Method not implemented.');
  }

  private async storeUserRefreshToken(
    token: string,
    userId: string
  ): Promise<void> {
    const expiresAt = new Date(
      Date.now() + this.authConfig.options.refreshExpiration
    );
    await this.refreshTokens.create(token, userId, expiresAt);
  }
}
