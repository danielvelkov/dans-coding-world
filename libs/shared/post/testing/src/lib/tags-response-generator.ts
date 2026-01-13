import { GetTagsResponse } from '@dans-coding-world/shared-post-dto';
import { BaseResponse } from '@dans-coding-world/api-types';
import { generateRandomTags } from './post-tags-generator.js';

export function generateMockGetTagsResponse({
  length = 5,
}: {
  length: number;
}): BaseResponse<GetTagsResponse> {
  return {
    error: null,
    success: true,
    data: {
      items: generateRandomTags({ length }),
      count: length,
    },
  };
}
