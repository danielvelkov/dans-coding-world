import type { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import styled from 'styled-components';
import Comment from './Comment';
import React, { useEffect, useState } from 'react';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import {
  useAuth,
  useDeleteComment,
  useReportComment,
} from '@dans-coding-world/public-blog-shared-hooks';
import CommentForm from './CommentForm';
import { FieldErrorText } from '@dans-coding-world/public-blog-ui-form';
import { useCommentContext } from '../hooks/useCommentContext';
import { ReportCommentModal } from './ReportCommentModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ActionButton } from './ActionButton';
import { toggleValue } from '@dans-coding-world/helpers';

const StyledCommentList = styled.ul<
  React.ComponentPropsWithoutRef<'ul'> & { $depth: number }
>`
  list-style: none;
  padding: 0;
  margin: 0;

  ${({ $depth, theme }) =>
    $depth > 0 &&
    `
      margin-top: 0.5em;
      margin-left: 2em;
      padding-left: 1em;
      border-left: 4px ${$depth !== 1 ? 'double' : 'solid'} ${theme.text.muted};
      opacity: 0.75;
      transition: border-color 0.2s ease;

      &:hover {
        border-color: ${
          $depth === 1 ? theme.accent?.primary : theme.shimmer.highlight
        };
        opacity: 1;
      }
    `}
`;

const CommentActionButton = styled(ActionButton)``;

const CommentListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  margin-top: 1.5em;

  .actions {
    margin-left: 2.5em;
  }
`;
const StyledReplyForm = styled(CommentForm)`
  padding-left: 0.5em;
  margin-left: 3em;

  border-left: 3px solid ${({ theme }) => theme.accent.primary};

  &:hover {
    border-color: ${({ theme }) => theme.accent.primary};
  }

  & > div {
    border-radius: 0;
    border-left: none;
  }

  button[type='submit'] {
    font-size: 0.8em;
    padding: 0.4em 1em;
  }
`;

const StyledEditForm = styled(CommentForm)`
  padding-left: 1em;
  margin-left: 2em;

  border-radius: 4px;
  & > div {
    border: 1px dashed ${({ theme }) => theme.text.muted};
  }

  & > div:focus-within {
    border: 1px dashed ${({ theme }) => theme.text.muted};
  }

  button[type='submit'] {
    font-size: 0.8em;
    padding: 0.4em 1em;
  }
`;

const ReplyError = styled.div`
  margin-left: 2em;
`;

const { MAX_REPLY_TREE_DEPTH } = COMMENT_CONSTRAINTS;

export function CommentThread({
  comments,
  parentComment,
}: {
  comments: CommentWithReplies[];
  parentComment?: CommentWithReplies;
}) {
  // Prepare yourself - a lot of state and variables up ahead
  // It's dangerous to go alone through it. Take this -> ⚔️
  const { isAuthenticated, user } = useAuth();
  const [expandedThreads, setExpandedThreads] = useState<number[]>([]);
  const {
    selectedCommentForEditId,
    setSelectedCommentForEditId,
    onEditSubmit,
    isSubmittingEdit,
    editError,
    isEditSuccess,

    selectedCommentForReplyId,
    setSelectedCommentForReplyId,
    onReplySubmit,
    isSubmittingReply,
    replyError,
    isCreateSuccess,
  } = useCommentContext();

  const { deleteComment, isPending, error: deletionError } = useDeleteComment();
  const {
    reportComment,
    isSubmitting: isSubmittingReport,
    error: reportingError,
    isSuccess: isReportSuccess,
  } = useReportComment();

  const [selectedCommentForDeletion, setSelectedCommentForDeletion] = useState<
    null | number
  >(null);
  const [selectedCommentForReporting, setSelectedCommentForReporting] =
    useState<null | number>(null);

  useEffect(() => {
    if (isEditSuccess) setSelectedCommentForEditId(null);
  }, [isEditSuccess, setSelectedCommentForEditId]);

  useEffect(() => {
    if (isCreateSuccess) {
      setSelectedCommentForReplyId(null);
      if (selectedCommentForReplyId)
        setExpandedThreads((prev) => [...prev, selectedCommentForReplyId]);
    }
  }, [
    isCreateSuccess,
    setSelectedCommentForReplyId,
    selectedCommentForReplyId,
  ]);

  useEffect(() => {
    if (isReportSuccess) setSelectedCommentForReporting(null);
  }, [isReportSuccess, setSelectedCommentForReporting]);

  const depth = comments[0]?.depth ?? 0;
  const hasComments = comments.length > 0;

  const isAtMaxDepth = (comment: CommentWithReplies) =>
    comment.depth >= MAX_REPLY_TREE_DEPTH;
  const anyAtMaxDepth = comments.some(isAtMaxDepth);

  if (!hasComments || anyAtMaxDepth) return null;

  const isReplyingTo = (id: number) => selectedCommentForReplyId === id;
  const isEditing = (id: number) => selectedCommentForEditId === id;
  const isExpanded = (id: number) => expandedThreads.includes(id);

  const canReply = (comment: CommentWithReplies) =>
    comment.depth !== MAX_REPLY_TREE_DEPTH - 1;
  const canDelete = (comment: CommentWithReplies) =>
    comment.userId === user?.id ||
    user?.role === 'ADMIN' ||
    user?.role === 'MOD';
  const canEdit = (comment: CommentWithReplies) => comment.userId === user?.id;
  const canReport = (comment: CommentWithReplies) =>
    comment.userId !== user?.id;

  const handleReplyClick = (comment: CommentWithReplies) => {
    setSelectedCommentForReplyId(isReplyingTo(comment.id) ? null : comment.id);
    // collapse thread if opening reply form
    if (!isReplyingTo(comment.id)) {
      setExpandedThreads((prev) => prev.filter((id) => id !== comment.id));
    }
  };

  const handleEditClick = (comment: CommentWithReplies) => {
    setSelectedCommentForEditId(isEditing(comment.id) ? null : comment.id);
    // collapse thread if opening edit form
    if (!isEditing(comment.id)) {
      setExpandedThreads((prev) => prev.filter((id) => id !== comment.id));
    }
  };

  const handleExpandClick = (comment: CommentWithReplies) => {
    setSelectedCommentForReplyId(null);
    setExpandedThreads((prev) => toggleValue(prev, comment.id));
  };

  return (
    <StyledCommentList
      $depth={depth}
      aria-label={
        depth > 0
          ? `Replies to ${parentComment?.user.username ?? 'comment'}`
          : 'Post comments'
      }
    >
      {comments.map((comment) => {
        const hasReplies = !!comment.replies?.length;
        const showReplyForm = isAuthenticated && isReplyingTo(comment.id);
        const showEditForm = isAuthenticated && isEditing(comment.id);
        const showDeleteModal = selectedCommentForDeletion === comment.id;
        const showReportModal = selectedCommentForReporting === comment.id;

        return (
          <CommentListItem
            key={comment.id}
            data-testid={`comment-${comment.id}`}
          >
            <Comment comment={comment} />

            <div className="actions">
              {isAuthenticated && canReply(comment) && (
                <CommentActionButton
                  disabled={user?.isBanned}
                  isOpen={isReplyingTo(comment.id)}
                  onClick={() => handleReplyClick(comment)}
                  label={'Reply'}
                  showCaret={true}
                  bannedMessage="You are banned. You cannot reply"
                  aria-expanded={isReplyingTo(comment.id)}
                ></CommentActionButton>
              )}

              {hasReplies && (
                <CommentActionButton
                  label={
                    isExpanded(comment.id)
                      ? 'Hide Replies'
                      : `View Replies (${comment.replyCount})`
                  }
                  disabled={false}
                  isOpen={isExpanded(comment.id)}
                  showCaret={true}
                  onClick={() => handleExpandClick(comment)}
                  aria-expanded={isExpanded(comment.id)}
                />
              )}

              {isAuthenticated && user && canEdit(comment) && (
                <CommentActionButton
                  label={'Edit'}
                  disabled={user.isBanned}
                  onClick={() => handleEditClick(comment)}
                  aria-expanded={showEditForm}
                  isOpen={showEditForm}
                  bannedMessage="You are banned. You cannot edit your comment."
                />
              )}

              {isAuthenticated && user && canDelete(comment) && (
                <>
                  <CommentActionButton
                    label={'Delete'}
                    disabled={user.isBanned}
                    isOpen={showDeleteModal}
                    onClick={() => setSelectedCommentForDeletion(comment.id)}
                    aria-expanded={showDeleteModal}
                    bannedMessage="You are banned. You cannot delete your comment."
                  />
                  {showDeleteModal && (
                    <DeleteConfirmModal
                      error={deletionError}
                      isPending={isPending}
                      onCancel={() => setSelectedCommentForDeletion(null)}
                      onConfirm={() => {
                        deleteComment({
                          authorId: user.id,
                          commentId: comment.id,
                          postId: comment.postId,
                        });
                      }}
                    ></DeleteConfirmModal>
                  )}
                </>
              )}

              {isAuthenticated && user && canReport(comment) && (
                <>
                  <CommentActionButton
                    label={'Report'}
                    disabled={user.isBanned}
                    isOpen={showReportModal}
                    onClick={() => setSelectedCommentForReporting(comment.id)}
                    aria-expanded={showReportModal}
                    bannedMessage="You are banned. You cannot issue reports."
                  />
                  {showReportModal && (
                    <ReportCommentModal
                      isSubmitting={isSubmittingReport}
                      onClose={() => setSelectedCommentForReporting(null)}
                      onSubmit={(val) =>
                        reportComment({ commentId: comment.id, reason: val })
                      }
                      error={reportingError ?? undefined}
                    ></ReportCommentModal>
                  )}
                </>
              )}
            </div>

            {showReplyForm && (
              <>
                <StyledReplyForm
                  isLocked={!isAuthenticated}
                  onSubmit={onReplySubmit}
                  isSubmitting={isSubmittingReply}
                  type="reply"
                />
                {replyError && (
                  <ReplyError>
                    <FieldErrorText>
                      <span data-testid="error-message">
                        {replyError.message}
                      </span>
                    </FieldErrorText>
                  </ReplyError>
                )}
              </>
            )}

            {showEditForm && (
              <>
                <StyledEditForm
                  isLocked={!isAuthenticated}
                  onSubmit={onEditSubmit}
                  isSubmitting={isSubmittingEdit}
                  value={comment.content}
                  type="edit"
                />
                {editError && (
                  <ReplyError>
                    <FieldErrorText>
                      <span data-testid="error-message">
                        {editError.message}
                      </span>
                    </FieldErrorText>
                  </ReplyError>
                )}
              </>
            )}

            {hasReplies && isExpanded(comment.id) && (
              <CommentThread
                comments={comment.replies}
                parentComment={comment}
              />
            )}
          </CommentListItem>
        );
      })}
    </StyledCommentList>
  );
}
export default CommentThread;
