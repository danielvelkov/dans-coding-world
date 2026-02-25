import {
  API_ENDPOINTS,
  ApiClient,
  toURLSearchParams,
} from '@dans-coding-world/shared-data-access-api';
import {
  CreateCommentDto,
  CreatePostDto,
  CreateTagDto,
  UpdatePostDto,
} from '@dans-coding-world/shared-post-dto';
import { urlEncodedHeaders } from './common.helper';

export function createPostsRouteHelper(client: ApiClient) {
  return {
    client,
    getPosts(params?: object) {
      return client.get(API_ENDPOINTS.POSTS.LIST, { params });
    },

    getPost(id: string) {
      return client.get(API_ENDPOINTS.POSTS.BY_ID(+id));
    },

    createPost(postData: Omit<CreatePostDto, 'authorId'>) {
      const urlSearchParams = toURLSearchParams(postData);
      return client.post(API_ENDPOINTS.POSTS.LIST, urlSearchParams, {
        headers: urlEncodedHeaders,
      });
    },

    updatePost(id: string, postData: Omit<UpdatePostDto, 'userId' | 'postId'>) {
      const urlSearchParams = toURLSearchParams(postData);

      return client.patch(API_ENDPOINTS.POSTS.BY_ID(+id), urlSearchParams, {
        headers: urlEncodedHeaders,
      });
    },

    deletePost(id: string) {
      return client.delete(API_ENDPOINTS.POSTS.BY_ID(+id));
    },

    getPostsMetadata() {
      return client.get(API_ENDPOINTS.POSTS.METADATA);
    },

    getPostComments(id: string, params?: object) {
      return client.get(API_ENDPOINTS.COMMENTS.LIST(+id), { params });
    },

    getComment(postId: string, commentId: string, params?: object) {
      return client.get(API_ENDPOINTS.COMMENTS.BY_ID(+postId, +commentId), {
        params,
      });
    },

    deleteComment(postId: string, commentId: string) {
      return client.delete(API_ENDPOINTS.COMMENTS.BY_ID(+postId, +commentId));
    },

    updateComment(postId: string, commentId: string, content: string) {
      return client.patch(API_ENDPOINTS.COMMENTS.BY_ID(+postId, +commentId), {
        content,
      });
    },

    createComment(
      postId: string,
      postData: Omit<CreateCommentDto, 'userId' | 'postId'>
    ) {
      const urlSearchParams = toURLSearchParams(postData);
      return client.post(
        API_ENDPOINTS.COMMENTS.LIST(+postId),
        urlSearchParams,
        {
          headers: urlEncodedHeaders,
        }
      );
    },

    getTags() {
      return client.get(API_ENDPOINTS.TAGS.LIST);
    },

    getTagById(tagId: string) {
      return client.get(API_ENDPOINTS.TAGS.BY_ID(+tagId));
    },

    deleteTag(tagId: string) {
      return client.delete(API_ENDPOINTS.TAGS.BY_ID(+tagId));
    },

    updateTag(tagId: string, name: string) {
      return client.patch(API_ENDPOINTS.TAGS.BY_ID(+tagId), { name });
    },

    createTag(tagData: CreateTagDto) {
      return client.post(API_ENDPOINTS.TAGS.LIST, tagData);
    },
  };
}
