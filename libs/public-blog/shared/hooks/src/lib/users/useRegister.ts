import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { RegisterDto } from '@dans-coding-world/shared-auth-dto';
import { useMutation } from '@tanstack/react-query';
import { UserWithoutPass } from './useAuthState';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import useAuth from './useAuth';

export function useRegister() {
  const { login } = useAuth();

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterDto) => {
      const response = await api.post<BaseResponse<{ user: UserWithoutPass }>>(
        API_ENDPOINTS.AUTH.REGISTER,
        { ...data },
      );
      return handleQueryResponse(response);
    },
    onSuccess: (_, variables) => {
      login({ email: variables.email, password: variables.password });
    },
  });

  return {
    register: registerMutation.mutate,
    isSubmitting: registerMutation.isPending,
    error: registerMutation.error,
  };
}
