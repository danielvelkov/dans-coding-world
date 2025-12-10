import { AxiosInstance } from 'axios';

export function createUsersRouteHelper(client: AxiosInstance) {
  return {
    async revokeUserTokens(userId: string) {
      return await client.post(`/api/v1/users/${userId}/revoke-tokens`);
    },

    async getUser(userId: string) {
      return await client.get(`/api/v1/users/${userId}`);
    },
  };
}
