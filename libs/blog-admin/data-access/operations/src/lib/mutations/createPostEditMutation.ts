import {
  createMutation,
  useQueryClient,
  type CreateMutationOptions,
} from '@tanstack/svelte-query';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import type { BaseResponse } from '@dans-coding-world/api-types';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import type { PostFull } from '@dans-coding-world/post-data-access';
import {
  type GetPostsResponseDto,
  UpdatePostDto,
} from '@dans-coding-world/shared-post-dto';

export function createPostEditMutation(
  id: number,
  options?: CreateMutationOptions<
    { post: PostFull } | null,
    Error,
    Omit<UpdatePostDto, 'postId' | 'userId'>
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<
    { post: PostFull } | null,
    Error,
    Omit<UpdatePostDto, 'postId' | 'userId'>
  >(() => ({
    mutationFn: async (data) => {
      const response = await api.patch<BaseResponse<{ post: PostFull }>>(
        API_ENDPOINTS.POSTS.BY_ID(id),
        { ...data },
      );
      return handleQueryResponse(response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          if (!Array.isArray(query.queryKey)) return false;
          if (query.queryKey[0] !== 'posts') return false;

          const data = query.state.data as GetPostsResponseDto | null;

          if (!data || !Array.isArray(data.items)) return false;

          return data.items.some((post) => post.id === id);
        },
      });
    },
    ...options,
  }));
}
