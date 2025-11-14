import {
  CreateCommentDto,
  CreatePostDto,
  CreateTagDto,
  UpdatePostDto,
} from '@dans-coding-world/shared-post-dto';
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

    async createPost(postData: Omit<CreatePostDto, 'authorId'>) {
      const formData = Object.fromEntries(
        Object.entries(postData).map(([key, value]) => [
          key,
          value === undefined ? 'undefined' : value.toString(),
        ])
      );

      const urlSearchParams = new URLSearchParams(formData);
      return await client.post('/api/v1/posts', urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async updatePost(
      id: string,
      postData: Omit<UpdatePostDto, 'userId' | 'postId'>
    ) {
      const formData = Object.fromEntries(
        Object.entries(postData).map(([key, value]) => [
          key,
          value === undefined ? 'undefined' : value.toString(),
        ])
      );

      const urlSearchParams = new URLSearchParams(formData);
      return await client.patch(`/api/v1/posts/${id}`, urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },

    async deletePost(id: string) {
      return await client.delete(`/api/v1/posts/${id}`);
    },

    async getPostComments(id: string, params?: object) {
      return await client.get(`/api/v1/posts/${id}/comments`, { params });
    },

    async getCommentReplies(postId: string, commentId: string) {
      return await client.get(`/api/v1/posts/${postId}/comments/${commentId}`);
    },

    async deleteComment(postId: string, commentId: string) {
      return await client.delete(
        `/api/v1/posts/${postId}/comments/${commentId}`
      );
    },

    async updateComment(postId: string, commentId: string, content: string) {
      return await client.patch(
        `/api/v1/posts/${postId}/comments/${commentId}`,
        { content }
      );
    },

    async createComment(
      postId: string,
      postData: Omit<CreateCommentDto, 'userId' | 'postId'>
    ) {
      const formData = Object.fromEntries(
        Object.entries(postData).map(([key, value]) => [
          key,
          value === undefined ? 'undefined' : value.toString(),
        ])
      );

      const urlSearchParams = new URLSearchParams(formData);
      return await client.post(
        `/api/v1/posts/${postId}/comments`,
        urlSearchParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    },

    async getTags() {
      return await client.get(`/api/v1/tags`);
    },

    async getTagById(tagId: string) {
      return await client.get(`/api/v1/tags/${tagId}`);
    },

    async deleteTag(tagId: string) {
      return await client.delete(`/api/v1/tags/${tagId}`);
    },

    async updateTag(tagId: string, name: string) {
      return await client.patch(`/api/v1/tags/${tagId}`, { name });
    },

    async createTag(tagData: CreateTagDto) {
      const formData = Object.fromEntries(
        Object.entries(tagData).map(([key, value]) => [
          key,
          value === undefined ? 'undefined' : value.toString(),
        ])
      );

      const urlSearchParams = new URLSearchParams(formData);
      return await client.post(`/api/v1/tags`, urlSearchParams, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    },
  };
}
