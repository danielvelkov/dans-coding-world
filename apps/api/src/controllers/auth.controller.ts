import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthService,
  config,
  ITokenService,
  IRegistrationService,
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
    private tokenService: ITokenService
  ) {}
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
  // Login route for generating JWT
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginDto: LoginDto = req.body;

      const result = await this.authService.login(loginDto);

      res.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
        httpOnly: true,
        maxAge: config.options.accessExpiration,
      });

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
        httpOnly: true,
        maxAge: config.options.refreshExpiration,
      });

      return res
        .status(StatusCodes.OK)
        .json({ message: SUCCESS_MESSAGES.AUTH.login, user: result.user });
    } catch (error) {
      return next(error);
    }
  };
  // Refresh route for generating new access/refresh token pair
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshDto: RefreshTokenDto = req.body;

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
  // Revoke token route for individual user refresh tokens
  revokeToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshDto: RefreshTokenDto = req.body;
      const revokedToken = await this.tokenService.revokeRefreshToken(
        refreshDto.token
      );

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.revoke,
        token: revokedToken,
      });
    } catch (error) {
      return next(error);
    }
  };
  // Revoke all tokens route
  revokeAllTokens = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await this.tokenService.revokeAllRefreshTokens();

      return res.status(StatusCodes.OK).json({
        message: SUCCESS_MESSAGES.AUTH.revoke,
        revokedCount: count,
      });
    } catch (error) {
      return next(error);
    }
  };
}
