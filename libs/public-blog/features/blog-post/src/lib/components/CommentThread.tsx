import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
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
import {
  Button,
  LoadingSpinner,
  Modal,
} from '@dans-coding-world/public-blog-ui-common';

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

const ActionButton = styled.button<
  React.ComponentPropsWithoutRef<'button'> & { $isOpen: boolean }
>`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 600;
  cursor: pointer;
  padding: 0.5em 0.75em;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.background.elevated};
    color: ${({ theme }) => theme.text.primary};
  }

  i {
    transition: transform 0.2s ease;
    transform: ${({ $isOpen }) =>
      $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2em;
`;

const CommentListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  margin-top: 1.5em;

  ${ActionButton}:first-of-type {
    margin-left: 3em;
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
    setExpandedThreads((prev) => toggleId(prev, comment.id));
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

        return (
          <CommentListItem
            key={comment.id}
            data-testid={`comment-${comment.id}`}
          >
            <Comment comment={comment} />

            {isAuthenticated && canReply(comment) && (
              <ReplyButton
                disabled={user?.isBanned}
                isOpen={isReplyingTo(comment.id)}
                onClick={() => handleReplyClick(comment)}
              />
            )}

            {hasReplies && (
              <ExpandRepliesButton
                comment={comment}
                isExpanded={isExpanded(comment.id)}
                onClick={() => handleExpandClick(comment)}
              />
            )}

            {isAuthenticated && user && canEdit(comment) && (
              <EditButton
                isOpen={false}
                disabled={user.isBanned}
                onClick={() => handleEditClick(comment)}
              ></EditButton>
            )}

            {isAuthenticated && user && canDelete(comment) && (
              <>
                <DeleteButton
                  disabled={user.isBanned}
                  isOpen={false}
                  onClick={() => setSelectedCommentForDeletion(comment.id)}
                />
                {selectedCommentForDeletion === comment.id && (
                  <Modal
                    open
                    modalTitle="Confirm Delete"
                    onClose={() => setSelectedCommentForDeletion(null)}
                  >
                    <StyledModalContent>
                      Are you sure you want to delete comment?
                      {deletionError && (
                        <FieldErrorText>
                          <span data-testid="error-message">
                            {deletionError.message}
                          </span>
                        </FieldErrorText>
                      )}
                      <div style={{ display: 'flex', gap: '1em' }}>
                        <Button
                          onClick={() => {
                            deleteComment({
                              authorId: user.id,
                              commentId: comment.id,
                              postId: comment.postId,
                            });
                          }}
                        >
                          {isPending ? (
                            <LoadingSpinner></LoadingSpinner>
                          ) : (
                            'Yes'
                          )}
                        </Button>
                        <Button
                          onClick={() => setSelectedCommentForDeletion(null)}
                        >
                          No
                        </Button>
                      </div>
                    </StyledModalContent>
                  </Modal>
                )}
              </>
            )}

            {isAuthenticated && user && canReport(comment) && (
              <>
                <ReportButton
                  disabled={user.isBanned}
                  isOpen={false}
                  onClick={() => setSelectedCommentForReporting(comment.id)}
                />
                {selectedCommentForReporting === comment.id && (
                  <Modal
                    open
                    modalTitle="Report Comment"
                    onClose={() => setSelectedCommentForReporting(null)}
                  >
                    <CommentReportForm
                      error={reportingError ?? undefined}
                      isSubmitting={isSubmittingReport}
                      onCancel={() => setSelectedCommentForReporting(null)}
                      onSubmit={(val) =>
                        reportComment({ commentId: comment.id, reason: val })
                      }
                    ></CommentReportForm>
                  </Modal>
                )}
              </>
            )}

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

function DeleteButton({
  isOpen,
  onClick,
  disabled,
}: {
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      disabled={disabled}
      aria-label={
        disabled ? 'You are banned. You cannot delete your comments' : undefined
      }
      $isOpen={isOpen}
      onClick={onClick}
    >
      Delete
    </ActionButton>
  );
}

function ReportButton({
  isOpen,
  onClick,
  disabled,
}: {
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      disabled={disabled}
      aria-label={disabled ? 'You are banned. You cannot report' : undefined}
      $isOpen={isOpen}
      onClick={onClick}
    >
      Report
    </ActionButton>
  );
}

function ReplyButton({
  isOpen,
  onClick,
  disabled,
}: {
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      disabled={disabled}
      aria-label={disabled ? 'You are banned. You cannot reply' : undefined}
      $isOpen={isOpen}
      onClick={onClick}
    >
      Reply
    </ActionButton>
  );
}

function EditButton({
  isOpen,
  onClick,
  disabled,
}: {
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      disabled={disabled}
      aria-label={disabled ? 'You are banned. You cannot edit' : undefined}
      $isOpen={isOpen}
      onClick={onClick}
    >
      Edit
    </ActionButton>
  );
}

function ExpandRepliesButton({
  comment,
  isExpanded,
  onClick,
}: {
  comment: CommentWithReplies;
  isExpanded: boolean;
  onClick: () => void;
}) {
  return (
    <ActionButton
      $isOpen={isExpanded}
      onClick={onClick}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? 'Hide' : 'View'} replies`}
    >
      <i className="fa fa-caret-down" />
      {isExpanded ? 'Hide Replies' : `View Replies (${comment.replyCount})`}
    </ActionButton>
  );
}

function CommentReportForm({
  onSubmit,
  error,
  isSubmitting,
  onCancel,
}: {
  onSubmit: (val: string) => void;
  error?: Error;
  isSubmitting: boolean;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const REPORT_REASONS = [
    'Inappropriate comment',
    'Spam',
    'Harassment or abusive behavior',
    'Misinformation or misleading content',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ margin: '.5em 0em' }}>Select report reason:</h3>
      {REPORT_REASONS.map((r) => (
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="checkbox"
            checked={reason === r}
            onChange={(e) => {
              const checked = (e.target as HTMLInputElement).checked;
              setReason(checked ? r : null);
            }}
          ></input>
          <span>{r}</span>
        </div>
      ))}
      {error && (
        <FieldErrorText>
          <span data-testid="error-message">{error.message}</span>
        </FieldErrorText>
      )}
      <div
        style={{
          display: 'flex',
          gap: '1em',
          alignSelf: 'center',
          marginTop: '1em',
        }}
      >
        <Button
          disabled={!reason}
          onClick={() => {
            if (reason) onSubmit(reason);
          }}
        >
          {isSubmitting ? <LoadingSpinner></LoadingSpinner> : 'Submit'}
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
}

export default CommentThread;
