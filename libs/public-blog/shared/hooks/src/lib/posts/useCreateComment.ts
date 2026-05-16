import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { handleQueryResponse } from '../helper/handle-query-response';
import {
  CreateCommentDto,
  GetPostCommentsDto,
} from '@dans-coding-world/shared-post-dto';
import { Comment } from '@dans-coding-world/prisma-schema';

export function useCreateComment() {
  const queryClient = useQueryClient();
  const createComment = useMutation({
    mutationFn: async (data: Omit<CreateCommentDto, 'userId'>) => {
      const response = await api.post<BaseResponse<{ comment: Comment }>>(
        API_ENDPOINTS.COMMENTS.LIST(data.postId),
        data
      );
      return handleQueryResponse(response);
    },
    onSuccess: (result) => {
      if (result?.comment)
        queryClient.invalidateQueries({
          queryKey: [
            'post-comments',
            { postId: result.comment.postId } as Pick<
              GetPostCommentsDto,
              'postId'
            >,
          ],
          exact: false,
        });
    },
  });

  return {
    createComment: createComment.mutate,
    isSubmitting: createComment.isPending,
    error: createComment.error,
    isSuccess: createComment.isSuccess,
    reset: createComment.reset,
  };
}
