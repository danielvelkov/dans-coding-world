import { useState } from 'react';
import { CommentContext } from '../contexts/CommentContext';
import {
  useCreateComment,
  useEditComment,
} from '@dans-coding-world/public-blog-shared-hooks';

export function CommentContextProvider({
  postId,
  children,
}: {
  postId: number;
  children: React.ReactNode;
}) {
  const {
    createComment,
    isSubmitting: isCreatingComment,
    error: commentingError,
    reset: resetCreateComment,
    isSuccess: isCreateSuccess,
  } = useCreateComment();
  const {
    editComment,
    isSubmitting: isSubmittingEdit,
    error: editError,
    reset: resetEditComment,
    isSuccess: isEditSuccess,
  } = useEditComment();

  const [selectedCommentForReplyId, setSelectedCommentForReplyId] = useState<
    number | null
  >(null);
  const [selectedCommentForEditId, setSelectedCommentForEditId] = useState<
    number | null
  >(null);

  const onEditSubmit = (val: string) => {
    if (!selectedCommentForEditId) return;

    editComment({
      postId,
      content: val,
      commentId: selectedCommentForEditId,
    });
  };

  const onReplySubmit = (val: string) => {
    if (!selectedCommentForReplyId) return;

    createComment({
      postId,
      content: val,
      replyToCommentId: selectedCommentForReplyId,
    });
  };

  return (
    <CommentContext.Provider
      value={{
        selectedCommentForReplyId,
        setSelectedCommentForReplyId: (id) => {
          if (isCreatingComment) return;
          resetCreateComment();
          setSelectedCommentForEditId(null);
          setSelectedCommentForReplyId(id);
        },

        selectedCommentForEditId,
        setSelectedCommentForEditId: (id) => {
          if (isSubmittingEdit) return;
          resetEditComment();
          setSelectedCommentForReplyId(null);
          setSelectedCommentForEditId(id);
        },

        onReplySubmit,
        onEditSubmit,
        isSubmittingReply: isCreatingComment,
        isSubmittingEdit,
        replyError: commentingError,
        editError,

        isCreateSuccess,
        isEditSuccess,
      }}
    >
      {children}
    </CommentContext.Provider>
  );
}
