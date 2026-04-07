import { Request, Response, NextFunction } from 'express';
import {
  ApiException,
  generateErrorResponse,
  generateErrorResponseByErrorCode,
} from '@dans-coding-world/exceptions';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
} from '@dans-coding-world/shared-constants';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ApiException) {
    const response = generateErrorResponse(
      err.statusCode,
      err.errorCode,
      err.message,
      err.details
    );
    res.status(err.statusCode).json(response);
  } else {
    const response = generateErrorResponseByErrorCode(
      ERROR_CODES.SERVER.INTERNAL_ERROR
    );
    res
      .status(ERROR_HTTP_STATUS[ERROR_CODES.SERVER.INTERNAL_ERROR])
      .json(response);
  }
  next();
}
