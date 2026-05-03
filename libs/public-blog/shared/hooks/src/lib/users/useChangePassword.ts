import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation } from '@tanstack/react-query';
import { UserWithoutPass } from './useAuthState';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { handleQueryResponse } from '../helper/handle-query-response';
import { ChangePasswordDto } from '@dans-coding-world/shared-user-dto';

export function useChangePassword() {
  const changePasswordMutation = useMutation({
    mutationFn: async (data: Omit<ChangePasswordDto, 'userId'>) => {
      const response = await api.patch<BaseResponse<{ user: UserWithoutPass }>>(
        API_ENDPOINTS.USERS.PASSWORD,
        data
      );
      return handleQueryResponse(response);
    },
  });

  return {
    changePassword: changePasswordMutation.mutate,
    isSubmitting: changePasswordMutation.isPending,
    error: changePasswordMutation.error,
    isSuccess: changePasswordMutation.isSuccess,
    reset: changePasswordMutation.reset,
  };
}
