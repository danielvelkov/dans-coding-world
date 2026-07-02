import { BaseResponse } from '@dans-coding-world/api-types';
import { deepMerge as merge } from '@dans-coding-world/helpers';
import { UserDetail } from '@dans-coding-world/user-data-access';
import { generateRandomUser } from './user-generator.js';
import {
  GetUserResponseDto,
  GetUsersResponseDto,
} from '@dans-coding-world/shared-user-dto';
import { PAGINATION } from '@dans-coding-world/shared-constants';

export function generateMockUserResponse({
  user,
}: {
  user?: Partial<UserDetail>;
}): BaseResponse<GetUserResponseDto> {
  const mockUser = generateRandomUser(user);
  return {
    error: null,
    success: true,
    data: {
      user: {
        ...mockUser,
      },
    },
  };
}

export function generateMockUsersResponse({
  length = 5,
  pageSize = PAGINATION.USERS.DEFAULT_ITEMS_PER_PAGE,
  data = {},
}: {
  length?: number;
  pageSize?: number;
  data?: Partial<BaseResponse<GetUsersResponseDto>['data']>;
}): BaseResponse<GetUsersResponseDto> {
  const defaultData: GetUsersResponseDto = {
    items: new Array({ length })
      .map(() => generateRandomUser())
      .slice(0, pageSize),
    pagination: {
      page: 1,
      totalPages: Math.ceil(length / pageSize),
      hasNext: false,
      hasPrev: false,
      limit: pageSize,
      total: length,
    },
    count: Math.min(length, pageSize),
  };

  return {
    error: null,
    success: true,
    data: merge(defaultData, data),
  };
}
