import axios from 'axios';

export async function revokeUserTokens(userId: string) {
  return await axios.post(`/api/v1/users/${userId}/revokeUserTokens`);
}
