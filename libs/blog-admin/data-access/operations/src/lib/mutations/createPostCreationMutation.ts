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
import { CreatePostDto } from '@dans-coding-world/shared-post-dto';

export function createPostCreationMutation(
  options?: CreateMutationOptions<
    { post: PostFull } | null,
    Error,
    Omit<CreatePostDto, 'authorId'>
  >,
) {
  const queryClient = useQueryClient();
  return createMutation<
    { post: PostFull } | null,
    Error,
    Omit<CreatePostDto, 'authorId'>
  >(() => ({
    mutationFn: async (data) => {
      const response = await api.post<BaseResponse<{ post: PostFull }>>(
        API_ENDPOINTS.POSTS.LIST,
        { ...data },
      );
      return handleQueryResponse(response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    ...options,
  }));
}
