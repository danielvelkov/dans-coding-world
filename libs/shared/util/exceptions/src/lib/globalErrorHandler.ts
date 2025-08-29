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
      errorCode: err.errorCode,
      message: err.message,
      details: err.details,
    });
  } else {
    res.status(500).json({
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong.',
    });
  }
  next();
}
