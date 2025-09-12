import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { IAuthService } from '@dans-coding-world/api-auth';
import { LoginDto } from '@dans-coding-world/shared-auth-dto';

export class AuthController {
  constructor(private authService: IAuthService) {}
  // Login route for generating JWT
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loginDto: LoginDto = req.body;

      const result = await this.authService.login(loginDto);

      return res
        .status(StatusCodes.OK)
        .json({ message: 'Login successful', ...result });
    } catch (error) {
      return next(error);
    }
  };
}
