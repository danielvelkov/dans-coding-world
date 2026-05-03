import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { handleQueryResponse } from '../helper/handle-query-response';

export function useDeleteAccount() {
  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete<BaseResponse>(
        API_ENDPOINTS.USERS.BY_ID(userId)
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
