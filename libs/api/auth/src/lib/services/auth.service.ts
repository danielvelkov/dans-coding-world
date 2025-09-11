import { IAuthService } from '../interfaces/auth-service.interface.js';
import { ITokenService } from '../interfaces/token-service.interface.js';
import { IUserRepository } from '@dans-coding-world/shared-data-access-interfaces';
import { userRepo } from '@dans-coding-world/user-data-access';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { ERROR_CODES } from '@dans-coding-world/shared-constants';
import { ApiException } from '@dans-coding-world/exceptions';
import { validPassword } from '../helper/password.helper.js';
import TokenService from './token.service.js';

export class AuthService implements IAuthService {
  constructor(
    public tokenService: ITokenService = TokenService,
    public users: IUserRepository = userRepo
  ) {}
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = dto;
    const user = await this.users.get({ email });

    if (!user) throw new ApiException(ERROR_CODES.AUTH.INVALID_CREDENTIALS);

    const isPasswordValid = await validPassword(password, user.password);

    if (isPasswordValid) {
      const payload = { sub: user.id };

      const accessToken = this.tokenService.generateAccessToken(payload);
      const refreshToken = this.tokenService.generateRefreshToken(user);
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
