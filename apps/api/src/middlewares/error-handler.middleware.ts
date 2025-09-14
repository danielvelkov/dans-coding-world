import { Request, Response, NextFunction } from 'express';
import { ApiException } from '@dans-coding-world/exceptions';
import { BaseResponse } from '@dans-coding-world/api-types';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ApiException) {
    const response: BaseResponse = {
      success: false,
      data: null,
      error: {
        status: err.statusCode,
        errorCode: err.errorCode,
        message: err.message,
        details: err.details ?? undefined,
      },
    };
    res.status(err.statusCode).json(response);
  } else {
    const response: BaseResponse = {
      success: false,
      data: null,
      error: {
        status: 500,
        errorCode: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong.',
        details: undefined,
      },
    };
    res.status(500).json(response);
  }
  next();
}
