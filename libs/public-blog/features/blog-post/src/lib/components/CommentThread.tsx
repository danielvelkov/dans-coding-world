import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import styled from 'styled-components';
import Comment from './Comment';
import React, { useState } from 'react';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import CommentForm from './CommentForm';
import { FieldErrorText } from '@dans-coding-world/public-blog-ui-form';
import { useReplyContext } from '../hooks/useReplyContext';

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

const CommentListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  margin-top: 1.5em;

  ${ActionButton}:first-of-type {
    margin-left: 3em;
    margin-right: 10px;
  }
`;

export const StyledReplyForm = styled(CommentForm)`
  padding-left: 1em;
  margin-left: 2em;

  &:hover {
    border-color: ${({ theme }) => theme.accent.primary};
  }

  & > div {
    border-radius: 0;
  }
  textarea {
    margin-bottom: 0.5em;
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
  const { isAuthenticated } = useAuth();
  const [expandedThreads, setExpandedThreads] = useState<number[]>([]);
  const {
    selectedCommentForReplyId,
    setSelectedCommentForReplyId,
    onReplySubmit,
    isSubmittingReply,
    replyError,
  } = useReplyContext();

  const depth = comments[0]?.depth ?? 0;
  const hasComments = comments.length > 0;

  const isAtMaxDepth = (comment: CommentWithReplies) =>
    comment.depth >= MAX_REPLY_TREE_DEPTH;
  const anyAtMaxDepth = comments.some(isAtMaxDepth);

  if (!hasComments || anyAtMaxDepth) return null;

  const isReplyingTo = (id: number) => selectedCommentForReplyId === id;
  const isExpanded = (id: number) => expandedThreads.includes(id);

  const canReply = (comment: CommentWithReplies) =>
    comment.depth !== MAX_REPLY_TREE_DEPTH - 1;

  const handleReplyClick = (comment: CommentWithReplies) => {
    setSelectedCommentForReplyId(isReplyingTo(comment.id) ? null : comment.id);
    // collapse thread if opening reply form
    if (!isReplyingTo(comment.id)) {
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

        return (
          <CommentListItem
            key={comment.id}
            data-testid={`comment-${comment.id}`}
          >
            <Comment comment={comment} />

            {isAuthenticated && canReply(comment) && (
              <ReplyButton
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

            {showReplyForm && (
              <>
                <StyledReplyForm
                  isLocked={false}
                  onSubmit={onReplySubmit}
                  isSubmitting={isSubmittingReply}
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

function ReplyButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <ActionButton $isOpen={isOpen} onClick={onClick}>
      Reply
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

function toggleId(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id];
}

export default CommentThread;
