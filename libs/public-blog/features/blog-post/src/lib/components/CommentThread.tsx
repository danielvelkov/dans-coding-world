import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import styled from 'styled-components';
import Comment from './Comment';
import React, { useState } from 'react';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

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

const CommentListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  margin-top: 1.5em;
`;

const StyledViewRepliesButton = styled.button<
  React.ComponentPropsWithoutRef<'button'> & { $isOpen: boolean }
>`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 600;
  cursor: pointer;
  padding: 0.5em 0.75em;

  margin-left: 3.5em;
  margin-top: 0.5em;

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

export function CommentThread({
  comments,
  parentComment,
}: {
  comments: CommentWithReplies[];
  parentComment?: CommentWithReplies;
}) {
  const [expandedCommentThreads, setExpandedCommentThreads] = useState(
    [] as number[]
  );

  if (
    !comments ||
    comments.length === 0 ||
    (comments &&
      comments.some(
        (c) => c.depth >= COMMENT_CONSTRAINTS.MAX_REPLY_TREE_DEPTH // do not show replies at that depth
      ))
  )
    return null;

  return (
    <StyledCommentList
      $depth={comments[0].depth}
      aria-label={
        comments[0].depth > 0
          ? `Replies to ${parentComment?.user.username || 'comment'}`
          : 'Post comments'
      }
    >
      {comments.map((comment) => (
        <CommentListItem key={comment.id}>
          <Comment comment={comment} />

          {comment.replies && comment.replies.length > 0 && (
            <>
              <StyledViewRepliesButton
                $isOpen={expandedCommentThreads.includes(comment.id)}
                onClick={() =>
                  setExpandedCommentThreads((prev) => {
                    if (prev.includes(comment.id))
                      return prev.filter((id) => id !== comment.id);
                    else return [...prev, comment.id];
                  })
                }
                aria-expanded={expandedCommentThreads.includes(comment.id)}
                aria-label={`${
                  expandedCommentThreads.includes(comment.id) ? 'Hide' : 'View'
                } replies`}
              >
                <i className="fa fa-caret-down"></i>
                {expandedCommentThreads.includes(comment.id)
                  ? 'Hide Replies'
                  : `View Replies (${comment.replyCount})`}
              </StyledViewRepliesButton>

              {expandedCommentThreads.includes(comment.id) && (
                <CommentThread
                  comments={comment.replies}
                  parentComment={comment}
                />
              )}
            </>
          )}
        </CommentListItem>
      ))}
    </StyledCommentList>
  );
}

export default CommentThread;
