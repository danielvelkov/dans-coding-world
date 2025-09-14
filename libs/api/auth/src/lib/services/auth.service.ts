import { IAuthService } from '../interfaces/auth-service.interface.js';
import type { ITokenService } from '../interfaces/token-service.interface.js';
import type { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { ApiException } from '@dans-coding-world/exceptions';
import { validPassword } from '../helper/password.helper.js';
import { Inject, Injectable } from 'injection-js';

export const TOKEN_SERVICE_TOKEN = 'ITokenService';
export const USER_REPOSITORY_TOKEN = 'IUserRepository';
// export const REFRESH_TOKEN_REPOSITORY_TOKEN = 'IRefreshTokenRepository';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(TOKEN_SERVICE_TOKEN)
    public tokenService: ITokenService,
    @Inject(USER_REPOSITORY_TOKEN)
    public users: IUserRepository
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

    const { password: _, ...userWithoutPass } = user;

    return { accessToken, refreshToken, user: userWithoutPass };
  }

  async refreshToken(
    refreshToken: string,
    userId: string
  ): Promise<LoginResponseDto> {
    throw new Error('Method not implemented.');
  }
}
