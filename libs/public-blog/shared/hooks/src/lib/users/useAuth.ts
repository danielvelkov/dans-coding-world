import { User } from '@dans-coding-world/prisma-schema';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { handleQueryResponse } from '../helper/handle-query-response';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';

export type UserWithoutPass = Omit<User, 'password'>;
export type LoginResponseWithoutTokens = Omit<
  LoginResponseDto,
  'accessToken' | 'refreshToken'
>;
export function useAuth() {
  const [user, setUser] = useState<UserWithoutPass | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginDto) => {
      const response = await api.post<BaseResponse<LoginResponseWithoutTokens>>(
        API_ENDPOINTS.AUTH.LOGIN,
        { data }
      );
      return handleQueryResponse(response);
    },
    onSuccess: (data) => {
      if (data) setUser(data.user);
    },
  });

  return {
    user,
    isAuthenticated: !!user,

    login: loginMutation.mutate,

    isLoading: loginMutation.isPending,
    error: loginMutation.error,
  };
}

export default useAuth;
