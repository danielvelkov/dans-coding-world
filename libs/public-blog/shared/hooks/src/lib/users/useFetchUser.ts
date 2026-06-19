import { useQuery } from '@tanstack/react-query';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { BaseResponse } from '@dans-coding-world/api-types';
import { GetUserResponseDto } from '@dans-coding-world/shared-user-dto';

export const useFetchUser = (
  userId: number,
  options?: { enabled?: boolean },
) => {
  const query = useQuery({
    staleTime: Infinity,
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetUserResponseDto>>(
        API_ENDPOINTS.USERS.BY_ID(userId),
      );
      return handleQueryResponse(response);
    },
    enabled: options?.enabled ?? !!userId,
  });

  return query;
};
