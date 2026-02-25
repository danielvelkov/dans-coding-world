import { http, HttpResponse } from 'msw';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import {
  generateMockPostsResponse,
  generateMockGetTagsResponse,
  generateMockPostMetadataResponse,
} from '@dans-coding-world/shared-post-testing';
import { BaseResponse } from '@dans-coding-world/api-types';
import {
  GetPostsMetadataResponse,
  GetTagsResponse,
} from '@dans-coding-world/shared-post-dto';

const mockPostResponse = generateMockPostsResponse({ length: 5, pageSize: 5 });
const mockTagsResponse = generateMockGetTagsResponse({ length: 5 });
const mockPostMetadataResponse = generateMockPostMetadataResponse({
  length: 5,
});

export const handlers = [
  http.get(
    `${api.instance.getUri()}${API_ENDPOINTS.POSTS.LIST}`,
    ({ request }) => {
      return HttpResponse.json<BaseResponse>(mockPostResponse);
    }
  ),
  http.get(`${api.instance.getUri()}${API_ENDPOINTS.TAGS.LIST}`, () => {
    return HttpResponse.json<BaseResponse<GetTagsResponse>>(mockTagsResponse);
  }),
  http.get(`${api.instance.getUri()}${API_ENDPOINTS.POSTS.METADATA}`, () => {
    return HttpResponse.json<BaseResponse<GetPostsMetadataResponse>>(
      mockPostMetadataResponse
    );
  }),
];
