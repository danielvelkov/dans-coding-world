import {
  ERROR_MESSAGES,
  ErrorCode,
  ERROR_HTTP_STATUS,
} from '@dans-coding-world/shared-constants';
import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { StatusCodes } from 'http-status-codes';

/**
 * Backend-only exception type.
 *
 * This class is thrown on the backend side and later transformed into
 * a `ResponseErrorDetails` object for API responses.
 *
 * @see {@link ResponseErrorDetails}
 */
export class ApiException<D> {
  public readonly details: D | null;
  public readonly errorCode: ErrorCode;
  public readonly message: string;
  public readonly statusCode: number;

  constructor(errorCode: ErrorCode, customMessage?: string, details?: D) {
    this.errorCode = errorCode;
    this.details = details ?? null;
    this.message =
      customMessage ??
      ERROR_MESSAGES[errorCode] ??
      'Unhandled server exception.';
    this.statusCode =
      ERROR_HTTP_STATUS[errorCode] || StatusCodes.INTERNAL_SERVER_ERROR;
  }
}
