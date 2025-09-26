import { ResponseErrorDetails } from '@dans-coding-world/api-types';
import { AxiosError } from 'axios';
import { ValidationErrorDetails } from '@dans-coding-world/exceptions';

export type AxiosApiErrorResponse = Partial<Omit<AxiosError, 'response'>> & {
  response: {
    status: number;
    data: { error: Partial<ResponseErrorDetails> };
  };
};

export const createErrorResponse = (
  statusCode: number,
  message?: string
): AxiosApiErrorResponse => ({
  response: {
    status: statusCode,
    data: {
      error: {
        message,
      },
    },
  },
});

export const createValidationErrorResponse = (
  errors: ValidationErrorDetails[]
): AxiosApiErrorResponse => {
  const res = createErrorResponse(400, 'Validation failed');
  res.response.data.error.details = errors;
  return res;
};
