import { AxiosInstance } from 'axios';

export function createPostsRouteHelper(client: AxiosInstance) {
  return {
    async getPosts(params?: object) {
      return await client.get('/api/v1/posts', { params });
    },
  };
}
