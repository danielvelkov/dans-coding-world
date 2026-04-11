import { BaseResponse } from '@dans-coding-world/api-types';
import { UserDetail } from '@dans-coding-world/user-data-access';
import { generateRandomUser } from './user-generator.js';
import { GetUserResponseDto } from '@dans-coding-world/shared-user-dto';

export function generateMockUserResponse({
  user,
}: {
  user?: Partial<UserDetail>;
}): BaseResponse<GetUserResponseDto> {
  const mockUser = generateRandomUser();
  return {
    error: null,
    success: true,
    data: {
      user: {
        ...mockUser,
        ...user,
      },
    },
  };
}
