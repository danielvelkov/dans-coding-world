import {
  createMutation,
  type CreateMutationOptions,
} from '@tanstack/svelte-query';
import type {
  LoginDto,
  LoginResponseDto,
} from '@dans-coding-world/shared-auth-dto';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import type { User } from '@dans-coding-world/prisma-schema';

export type UserWithoutPass = Omit<User, 'password'>;
export type LoginResponseWithoutTokens = Omit<
  LoginResponseDto,
  'accessToken' | 'refreshToken'
>;
export function createLoginMutation(
  options?: CreateMutationOptions<
    LoginResponseWithoutTokens | null,
    Error,
    LoginDto
  >,
) {
  return createMutation<LoginResponseWithoutTokens | null, Error, LoginDto>(
    () => ({
      mutationFn: async (data) => {
        const response = await api.post<
          BaseResponse<LoginResponseWithoutTokens>
        >(API_ENDPOINTS.AUTH.LOGIN, { ...data });
        return handleQueryResponse(response);
      },
      onSuccess: (data) => {
        if (data) return data.user;
        return null;
      },
      ...options,
    }),
  );
}
