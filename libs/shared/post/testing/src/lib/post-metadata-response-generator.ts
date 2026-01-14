import { GetPostsMetadataResponse } from '@dans-coding-world/shared-post-dto';
import { BaseResponse } from '@dans-coding-world/api-types';
import { randPastDate } from '@ngneat/falso';

export function generatePostMetadataResponse({
  length = 5,
  years,
}: {
  length: number;
  years?: number[];
}): BaseResponse<GetPostsMetadataResponse> {
  return {
    error: null,
    success: true,
    data: {
      years: years ?? [
        ...new Set(
          randPastDate({ length, years: 100 }).map((date) => date.getFullYear())
        ),
      ],
    },
  };
}
