import { BaseResponse } from '@dans-coding-world/api-types';
import { api } from '@dans-coding-world/public-blog-data-access-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  API_ENDPOINTS,
  handleQueryResponse,
} from '@dans-coding-world/shared-data-access-api';
import {
  DeleteCommentDto,
  GetPostCommentsDto,
} from '@dans-coding-world/shared-post-dto';
import type { Comment } from '@dans-coding-world/prisma-schema';

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const deleteComment = useMutation({
    mutationFn: async (data: DeleteCommentDto) => {
      const response = await api.delete<BaseResponse<{ comment: Comment }>>(
        API_ENDPOINTS.COMMENTS.BY_ID(data.postId, data.commentId),
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
    deleteComment: deleteComment.mutate,
    isPending: deleteComment.isPending,
    error: deleteComment.error,
    isDeleted: deleteComment.isSuccess,
    reset: deleteComment.reset,
  };
}
