import { Request, Response, NextFunction } from 'express';
import { ApiException } from '@dans-coding-world/exceptions';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  ERROR_HTTP_STATUS,
} from '@dans-coding-world/shared-constants';

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
        status: ERROR_HTTP_STATUS[ERROR_CODES.SERVER.INTERNAL_ERROR],
        errorCode: ERROR_CODES.SERVER.INTERNAL_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.SERVER.INTERNAL_ERROR],
        details: undefined,
      },
    };
    res
      .status(ERROR_HTTP_STATUS[ERROR_CODES.SERVER.INTERNAL_ERROR])
      .json(response);
  }
  next();
}
