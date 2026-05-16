import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { API_ENDPOINTS } from '@dans-coding-world/shared-data-access-api';
import { handleQueryResponse } from '../helper/handle-query-response';
import {
  GetPostCommentsDto,
  UpdateCommentDto,
} from '@dans-coding-world/shared-post-dto';
import { Comment } from '@dans-coding-world/prisma-schema';

export function useEditComment() {
  const queryClient = useQueryClient();
  const editComment = useMutation({
    mutationFn: async (data: Omit<UpdateCommentDto, 'userId'>) => {
      const response = await api.patch<BaseResponse<{ comment: Comment }>>(
        API_ENDPOINTS.COMMENTS.BY_ID(data.postId, data.commentId),
        data
      );
      return handleQueryResponse(response);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({
        queryKey: [
          'post-comments',
          { postId } as Pick<GetPostCommentsDto, 'postId'>,
        ],
        exact: false,
      });
    },
  });

  return {
    editComment: editComment.mutate,
    isSubmitting: editComment.isPending,
    error: editComment.error,
    isSuccess: editComment.isSuccess,
    reset: editComment.reset,
  };
}
