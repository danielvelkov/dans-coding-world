import { IAuthService } from '../interfaces/auth-service.interface.js';
import { ITokenService } from '../interfaces/token-service.interface.js';
import { client } from '@dans-coding-world/user-data-access';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { ApiException } from '@dans-coding-world/exceptions';
import { validPassword } from '../helper/password.helper.js';
import config, { AuthConfiguration } from '../config/auth.config.js';
import tokenService from './token.service.js';

class AuthService implements IAuthService {
  constructor(
    public jwtConfig: AuthConfiguration = config,
    public tokenService: ITokenService = tokenService
  ) {}
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = dto;
    const user = await client.get({ email });

    if (!user) throw new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);

    const isPasswordValid = await validPassword(password, user.password);

    if (isPasswordValid) {
      const payload = { sub: user.id };

      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = await tokenService.generateRefreshToken(
        user.id.toString()
      );
      return { accessToken, refreshToken, user };
    } else throw new ApiException(ERROR_CODES.AUTH.INVALID_PASSWORD);
  }

  async refreshToken(
    refreshToken: string,
    userId: string
  ): Promise<LoginResponseDto> {
    throw new Error('Method not implemented.');
  }
}

export default new AuthService();
