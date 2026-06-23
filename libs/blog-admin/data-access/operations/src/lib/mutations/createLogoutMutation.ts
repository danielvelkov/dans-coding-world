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

export function createLogoutMutation(
  options?: CreateMutationOptions<object | null, Error>,
) {
  return createMutation<object | null, Error>(() => ({
    mutationFn: async () => {
      const response = await api.post<BaseResponse>(
        API_ENDPOINTS.AUTH.LOGOUT,
      );
      return handleQueryResponse(response);
    },
    ...options,
  }));
}
