import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { AxiosError } from 'axios';
import type { ValidationErrorDetails } from '@dans-coding-world/exceptions';
import {
  type ErrorCode,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
  ERROR_CODES,
} from '@dans-coding-world/shared-constants';

export type AxiosApiErrorResponse = Partial<Omit<AxiosError, 'response'>> & {
  response: {
    status: number;
    data: { error: Partial<ResponseErrorDetails> };
  };
};

export const createErrorCodeResponse = (
  error: ErrorCode,
  customMessage?: string,
): AxiosApiErrorResponse => ({
  response: {
    status: ERROR_HTTP_STATUS[error],
    data: {
      error: {
        message: customMessage ?? ERROR_MESSAGES[error],
      },
    },
  },
});

export const createValidationErrorResponse = (
  errors: ValidationErrorDetails[],
): AxiosApiErrorResponse => {
  const res = createErrorCodeResponse(ERROR_CODES.VALIDATION.VALIDATION_ERROR);
  res.response.data.error.details = errors;
  return res;
};
