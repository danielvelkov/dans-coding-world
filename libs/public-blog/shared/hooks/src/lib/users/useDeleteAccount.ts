import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation } from '@tanstack/react-query';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';

export function useDeleteAccount() {
  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete<BaseResponse>(
        API_ENDPOINTS.USERS.BY_ID(userId),
      );
      return handleQueryResponse(response);
    },
  });

  return {
    deleteAccount: deleteAccountMutation.mutate,
    isSubmitting: deleteAccountMutation.isPending,
    error: deleteAccountMutation.error,
    isSuccess: deleteAccountMutation.isSuccess,
  };
}
