import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  IAuthService,
  config,
  IRegistrationService,
} from '@dans-coding-world/api-auth';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from '@dans-coding-world/shared-auth-dto';

export class AuthController {
  constructor(
    private authService: IAuthService,
    private registrationService: IRegistrationService
  ) {}
  // User sign up route
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const registerDto: RegisterDto = req.body;

      const result = await this.registrationService.register(registerDto);

      return res
        .status(StatusCodes.CREATED)
        .json({ message: 'User registered successfully', user: result.user });
    } catch (error) {
      return next(error);
    }
  };
  // Login route for generating JWT
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginDto: LoginDto = req.body;

      const result = await this.authService.login(loginDto);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        maxAge: config.options.accessExpiration,
      });

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        maxAge: config.options.refreshExpiration,
      });

      return res
        .status(StatusCodes.OK)
        .json({ message: 'Login successful', user: result.user });
    } catch (error) {
      return next(error);
    }
  };
  // Refresh route for generating new access/refresh token pair
  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshDto: RefreshTokenDto = req.body;

      const result = await this.authService.refreshToken(refreshDto);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        maxAge: config.options.accessExpiration,
      });

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        maxAge: config.options.refreshExpiration,
      });

      return res.status(StatusCodes.OK).json({
        message: 'New access and refresh token issued',
        user: result.user,
      });
    } catch (error) {
      return next(error);
    }
  };
}
