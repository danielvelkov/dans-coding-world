import { ErrorResponse } from '@dans-coding-world/api-types';
import {
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
  ErrorCode,
} from '@dans-coding-world/shared-constants';

export function generateErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: any
): ErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      status,
      errorCode: code,
      message,
      details: details ?? undefined,
    },
  };
}

export function generateErrorResponseByErrorCode(
  code: ErrorCode,
  details?: any
): ErrorResponse {
  return generateErrorResponse(
    ERROR_HTTP_STATUS[code],
    code,
    ERROR_MESSAGES[code],
    details ?? undefined
  );
}
