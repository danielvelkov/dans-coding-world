import { User } from '@dans-coding-world/prisma-schema';
import { noop, useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  API_ENDPOINTS,
  ApiError,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { LoginDto, LoginResponseDto } from '@dans-coding-world/shared-auth-dto';
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  TOKEN_CONSTRAINTS,
} from '@dans-coding-world/shared-constants';
import { useFetchUser } from './useFetchUser';
import { useAuth } from './useAuth';
import { UserDetail } from '@dans-coding-world/user-data-access';

export type UserWithoutPass = Omit<User, 'password'>;
export type LoginResponseWithoutTokens = Omit<
  LoginResponseDto,
  'accessToken' | 'refreshToken'
>;

/**
 * Core authentication state for the application.
 * Intended to be used inside {@link AuthProvider} only — do not call directly in components.
 *
 * Use {@link useAuth} instead to access the shared auth context.
 *
 * Handles:
 * - Login / logout mutations
 * - Silent token refresh on mount (rehydration from httpOnly cookie)
 * - Periodic access token refresh via interval
 * - Fetching full user profile details once authenticated
 */
export function useAuthState() {
  const [user, setUser] = useState<Omit<UserDetail, 'password'> | null>(null);
  const [isAuthBootstrapPending, setIsAuthBootstrapPending] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshMutateRef = useRef<() => void>(() => noop);

  const { data: userDataResponse, isLoading: isLoadingProfile } = useFetchUser(
    user?.id as number,
    { enabled: !!user },
  );

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<BaseResponse<LoginResponseWithoutTokens>>(
        API_ENDPOINTS.AUTH.REFRESH,
      );
      return handleQueryResponse(response);
    },
    onSuccess: (data) => {
      if (data) setUser(data.user);
    },
    onError: (error) => {
      setUser(null);
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    },
    onSettled: () => {
      setIsAuthBootstrapPending(false);
    },
  });

  refreshMutateRef.current = refreshMutation.mutate;

  const loginMutation = useMutation({
    mutationFn: async (data: LoginDto) => {
      const response = await api.post<BaseResponse<LoginResponseWithoutTokens>>(
        API_ENDPOINTS.AUTH.LOGIN,
        { ...data },
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
    onError: (error) => {
      const apiError = error as ApiError;
      if (
        apiError.status &&
        (apiError.status === ERROR_HTTP_STATUS[ERROR_CODES.SERVER.NOT_FOUND] ||
          apiError.status === ERROR_HTTP_STATUS[ERROR_CODES.AUTH.UNAUTHORIZED])
      )
        setUser(null);
    },
    onSettled: () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    },
  });

  // Try to refresh on mount:
  // If access token cookie is present,
  // user will not have to login again on refresh or tab change
  useEffect(() => {
    refreshMutateRef.current();
  }, []);

  const isAuthenticated = !!user;

  return {
    user: isAuthenticated ? (userDataResponse?.user ?? user) : null,
    isAuthenticated: !!user,

    login: loginMutation.mutate,
    logout: logoutMutation.mutate,

    isLoading:
      isAuthBootstrapPending ||
      loginMutation.isPending ||
      logoutMutation.isPending,
    isRefreshing: isAuthBootstrapPending,
    error: loginMutation.error || logoutMutation.error,
    isLoadingProfile,
  };
}
