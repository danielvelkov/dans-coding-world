import { AxiosInstance } from 'axios';

// Axios uses URLSearchParams under the hood
// Nested objects (like sortBy) are serialized using bracket notation: sortBy[key]=value.
// Arrays become repeated keys: { tags: ['a', 'b'] } → tags=a&tags=b
export function createPostsRouteHelper(client: AxiosInstance) {
  return {
    async getPosts(params?: object) {
      return await client.get('/api/v1/posts', { params });
    },
    async getPost(id: string) {
      return await client.get(`/api/v1/posts/${id}`);
    },
  };
}
