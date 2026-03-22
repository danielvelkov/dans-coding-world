import {
  BaseResponse,
  ResponseErrorDetails,
} from '@dans-coding-world/api-types';
import { ApiError } from '../types/apiError';

export function handleQueryResponse<ResponseDto>(
  response: BaseResponse<ResponseDto>
) {
  if (!response) throw new Error('An unknown error occurred');
  else if (!response.success) {
    const error = response.error as ResponseErrorDetails;
    throw new ApiError(
      error.status,
      error.message ?? 'Something went wrong',
      error.errorCode,
      error.details
    );
  }

  return response.data;
}
