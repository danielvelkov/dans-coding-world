import { GetPostsResponseDto } from './get-posts-response.dto.js';

export type SearchPostsResponseDto = GetPostsResponseDto & {
  query: string;
};
