import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthService,
  config,
  ITokenService,
  IRegistrationService,
  Authorized,
  RequiredRole,
  BlockBanned,
} from '@dans-coding-world/api-auth';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '@dans-coding-world/shared-auth-dto';
import {
  SUCCESS_MESSAGES,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@dans-coding-world/shared-constants';

export class AuthController {
  constructor(
    private authService: IAuthService,
    private registrationService: IRegistrationService,
    private tokenService: ITokenService,
  ) {
    this.logout = this.logout.bind(this);
    this.revokeToken = this.revokeToken.bind(this);
    this.revokeAllTokens = this.revokeAllTokens.bind(this);
  }

  // User sign up route
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registerDto: RegisterDto = req.body;

      const result = await this.registrationService.register(registerDto);

      return res
        .status(StatusCodes.CREATED)
        .json({ message: SUCCESS_MESSAGES.AUTH.register, user: result.user });
    } catch (error) {
      return next(error);
    }
  };

  // Login route for generating JWT token pair
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginDto: LoginDto = req.body;

      const { accessToken, refreshToken, user } =
        await this.authService.login(loginDto);

      res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
        httpOnly: true,
        maxAge: config.options.accessExpiration,
      });

      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
        httpOnly: true,
        maxAge: config.options.refreshExpiration,
      });

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.AUTH.login, user });
    } catch (error) {
      return next(error);
    }
  };

  @Authorized()
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];

      // Clear cookies
      res.clearCookie(ACCESS_TOKEN_COOKIE, {
        httpOnly: true,
      });
      res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
      });

      await this.tokenService.revokeRefreshToken({
        token: refreshToken,
      });

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.AUTH.logout });
    } catch (error) {
      return next(error);
    }
  }

  // Refresh route for generating new access/refresh token pair
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
      const refreshDto: RefreshTokenDto = {
        token: refreshToken,
      };

      const result = await this.authService.refreshToken(refreshDto);

      res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
        httpOnly: true,
        maxAge: config.options.accessExpiration,
      });

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
        httpOnly: true,
        maxAge: config.options.refreshExpiration,
      });

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.token,
        user: result.user,
      });
    } catch (error) {
      return next(error);
    }
  };

  // Revoke token route for individual invalidation of user refresh tokens
  @Authorized()
  @BlockBanned()
  @RequiredRole('MOD', 'ADMIN')
  async revokeToken(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshTokenDto: RefreshTokenDto = {
        ...req.body,
      };

      const revokedToken =
        await this.tokenService.revokeRefreshToken(refreshTokenDto);

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.revoke,
        token: revokedToken,
      });
    } catch (error) {
      return next(error);
    }
  }

  // Revoke all refresh tokens route
  @Authorized()
  @RequiredRole('ADMIN')
  async revokeAllTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const count = await this.tokenService.revokeAllRefreshTokens();

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.revoke,
        revokedCount: count,
      });
    } catch (error) {
      return next(error);
    }
  }
}
