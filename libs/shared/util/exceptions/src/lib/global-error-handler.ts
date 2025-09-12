import { Request, Response, NextFunction } from 'express';
import { ApiException } from './api.exception.js';

export function globalErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ApiException) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: {
        status: err.statusCode,
        errorCode: err.errorCode,
        message: err.message,
        details: err.details ?? undefined,
      },
    });
  } else {
    res.status(500).json({
      status: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong.',
    });
  }
  next();
}
