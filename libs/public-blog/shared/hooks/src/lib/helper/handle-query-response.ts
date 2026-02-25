import { BaseResponse } from '@dans-coding-world/api-types';

export function handleQueryResponse<ResponseDto>(
  response: BaseResponse<ResponseDto>
) {
  if (!response) return Promise.reject('An unknown error occurred');
  else if (!response.success) {
    return Promise.reject(response.error);
  }

  return response.data;
}
