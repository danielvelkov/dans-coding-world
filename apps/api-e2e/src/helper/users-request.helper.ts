import { AxiosInstance } from 'axios';

export function createUsersRouteHelper(client: AxiosInstance) {
  return {
    async revokeUserTokens(userId: string) {
      return await client.post(`/api/v1/users/${userId}/revokeUserTokens`);
    },
  };
}
