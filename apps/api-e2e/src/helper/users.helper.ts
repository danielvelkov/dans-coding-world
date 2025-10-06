import { AxiosInstance } from 'axios';

export function createUsersHelpers(axios: AxiosInstance) {
  return {
    async revokeUserTokens(userId: string) {
      return await axios.post(`/api/v1/users/${userId}/revokeUserTokens`);
    },
  };
}
