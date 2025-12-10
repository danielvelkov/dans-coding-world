import { AxiosInstance } from 'axios';
import { UpdateUserDto } from '@dans-coding-world/shared-user-dto';

export function createUsersRouteHelper(client: AxiosInstance) {
  return {
    async revokeUserTokens(userId: string) {
      return await client.post(`/api/v1/users/${userId}/revoke-tokens`);
    },

    async getUser(userId: string) {
      return await client.get(`/api/v1/users/${userId}`);
    },

    async updateUser(profileData: Omit<UpdateUserDto, 'userId'>) {
      const urlSearchParams = new URLSearchParams();

      for (const [key, value] of Object.entries(profileData)) {
        if (value === undefined) {
          urlSearchParams.append(key, 'undefined');
        } else {
          urlSearchParams.append(key, value.toString());
        }
      }
      return await client.patch(`/api/v1/users`, urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },
  };
}
