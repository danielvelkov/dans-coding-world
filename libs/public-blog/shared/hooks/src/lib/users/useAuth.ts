import { User } from '@dans-coding-world/prisma-schema';
import { noop, useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { handleQueryResponse } from '../helper/handle-query-response';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import { TOKEN_CONSTRAINTS } from '@dans-coding-world/shared-constants';

export type UserWithoutPass = Omit<User, 'password'>;
export type LoginResponseWithoutTokens = Omit<
  LoginResponseDto,
  'accessToken' | 'refreshToken'
>;
export function useAuth() {
  const [user, setUser] = useState<UserWithoutPass | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshMutateRef = useRef<() => void>(() => noop);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<BaseResponse<LoginResponseWithoutTokens>>(
        API_ENDPOINTS.AUTH.REFRESH
      );
      return handleQueryResponse(response);
    },
    onSuccess: (data) => {
      if (data) setUser(data.user);
    },
    onError: (error) => {
      console.log('Could not refresh user session');
      console.log(error);
      setUser(null);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    },
  });

  refreshMutateRef.current = refreshMutation.mutate;

  const loginMutation = useMutation({
    mutationFn: async (data: LoginDto) => {
      const response = await api.post<BaseResponse<LoginResponseWithoutTokens>>(
        API_ENDPOINTS.AUTH.LOGIN,
        { ...data }
      );
      return handleQueryResponse(response);
    },
    onSuccess: (data) => {
      if (data) setUser(data.user);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);

      refreshIntervalRef.current = setInterval(() => {
        refreshMutateRef.current();
      }, TOKEN_CONSTRAINTS.ACCESS_TOKEN_EXPIRATION);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<BaseResponse>(API_ENDPOINTS.AUTH.LOGOUT);
      return handleQueryResponse(response);
    },
    onSuccess: () => {
      setUser(null);
    },
    onSettled: () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    },
  });

  return {
    user,
    isAuthenticated: !!user,

    login: loginMutation.mutate,
    logout: logoutMutation.mutate,

    isLoading: loginMutation.isPending || logoutMutation.isPending,
    error: loginMutation.error || logoutMutation.error,
  };
}

export default useAuth;
