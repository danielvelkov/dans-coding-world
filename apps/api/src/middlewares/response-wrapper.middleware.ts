import { Request, Response, NextFunction } from 'express';
import { BaseResponse } from '@dans-coding-world/api-types';

/**
 * Express middleware that wraps a successful JSON response in a
 * specific structure.
 * @example
 * ```
 * app.use(responseWrapper)
 * ```
 */
export function responseWrapper(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const originalJson = res.json;

  res.json = function (data) {
    if (data && data.success === false) return originalJson.call(this, data);

    const wrapped: BaseResponse = {
      success: true,
      data,
      error: null,
    };
    return originalJson.call(this, wrapped);
  };

  next();
}
