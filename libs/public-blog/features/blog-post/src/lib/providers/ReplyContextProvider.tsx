import { useState } from 'react';
import { ReplyContext } from '../contexts/ReplyContext';
import { useCreateComment } from '@dans-coding-world/public-blog-shared-hooks';

export function ReplyContextProvider({
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
    reset,
  } = useCreateComment();

  const [selectedCommentForReplyId, setSelectedCommentForReplyId] = useState<
    number | null
  >(null);

  const onReplySubmit = (val: string) => {
    if (!selectedCommentForReplyId) return;

    createComment({
      postId,
      content: val,
      replyToCommentId: selectedCommentForReplyId,
    });
  };

  return (
    <ReplyContext.Provider
      value={{
        selectedCommentForReplyId,
        setSelectedCommentForReplyId: (id) => {
          reset();
          setSelectedCommentForReplyId(id);
        },
        onReplySubmit,
        isSubmittingReply: isCreatingComment,
        replyError: commentingError,
      }}
    >
      {children}
    </ReplyContext.Provider>
  );
}
