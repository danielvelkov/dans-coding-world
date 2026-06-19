import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserWithoutPass } from './useAuthState';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { UpdateUserDto } from '@dans-coding-world/shared-user-dto';

export const multipartHeaders = { 'Content-Type': 'multipart/form-data' };

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateProfileMutation = useMutation({
    mutationFn: async (
      data: Omit<UpdateUserDto, 'avatar'> & { avatar?: File },
    ) => {
      const response = await api.patch<BaseResponse<{ user: UserWithoutPass }>>(
        API_ENDPOINTS.USERS.UPDATE,
        data,
        {
          headers: multipartHeaders,
        },
      );
      return handleQueryResponse(response);
    },
    onSuccess: (result) => {
      if (result?.user)
        queryClient.invalidateQueries({ queryKey: ['user', result.user.id] });
    },
  });

  return {
    updateProfile: updateProfileMutation.mutate,
    isSubmitting: updateProfileMutation.isPending,
    error: updateProfileMutation.error,
    isSuccess: updateProfileMutation.isSuccess,
    reset: updateProfileMutation.reset,
  };
}
