import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import { GetTagsResponse } from '@dans-coding-world/shared-post-dto';
import { useQuery } from '@tanstack/react-query';

const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

export const useFetchTags = () => {
  const query = useQuery({
    staleTime: THIRTY_MINUTES_IN_MS,
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await api.get<BaseResponse<GetTagsResponse>>(
        API_ENDPOINTS.TAGS.LIST,
      );

      return handleQueryResponse(response);
    },
  });

  return query;
};
