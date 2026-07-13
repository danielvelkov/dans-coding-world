import {
  createMutation,
  type CreateMutationOptions,
} from '@tanstack/svelte-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { LoginResponseWithoutTokens } from './createLoginMutation.js';

export function createRefreshUserAuthMutation(
  options?: CreateMutationOptions<LoginResponseWithoutTokens | null, Error>,
) {
  return createMutation<LoginResponseWithoutTokens | null, Error>(() => ({
    mutationFn: async () => {
      const response = await api.post<BaseResponse<LoginResponseWithoutTokens>>(
        API_ENDPOINTS.AUTH.REFRESH,
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
