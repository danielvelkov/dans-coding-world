import { PAGINATION } from '@dans-coding-world/shared-constants';
import { GetReportsResponseDto } from '@dans-coding-world/shared-report-dto';
import { BaseResponse } from '@dans-coding-world/api-types';
import { generateRandomCommentReports } from './comment-reports-generator.js';

export function generateMockCommentReportsResponse({
  length = 5,
  pageSize = PAGINATION.REPORTS.DEFAULT_ITEMS_PER_PAGE,
}: {
  length: number;
  pageSize: number;
}): BaseResponse<GetReportsResponseDto> {
  return {
    error: null,
    success: true,
    data: {
      items: generateRandomCommentReports(length).slice(0, pageSize),
      pagination: {
        page: 1,
        totalPages: Math.ceil(length / pageSize),
        hasNext: false,
        hasPrev: false,
        limit: pageSize,
        total: length,
      },
      count: length > pageSize ? pageSize : length,
    },
  };
}
