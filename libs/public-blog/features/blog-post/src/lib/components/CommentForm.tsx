import React, { useState } from 'react';
import styled from 'styled-components';
import { Button, Modal } from '@dans-coding-world/public-blog-ui-common';
import { Link } from 'react-router-dom';
import { COMMENT_CONSTRAINTS } from '@dans-coding-world/shared-constants';

const StyledCommentForm = styled.form<React.ComponentPropsWithRef<'textarea'>>`
  position: relative;
`;

const StyledTextArea = styled.textarea<React.ComponentPropsWithRef<'textarea'>>`
  margin-bottom: 1em;
  width: 100%;
  border: none;
  resize: none;
  color: inherit;
  font-family: inherit;
  background-color: inherit;

  &:focus {
    border: none;
    outline: none;
  }
`;

const StyledTextAreaWrapper = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  position: relative;
  border-radius: 5px;
  width: 100%;
  padding: 1em;
  margin-top: 1em;
  border: 1px solid ${({ theme }) => theme.border.primary};
  background-color: ${({ theme }) => theme.background.surface};
  color: ${({ theme }) => theme.text.secondary};
  font-family: inherit;
  resize: none;

  &:hover {
    border-color: ${({ theme }) => theme.border.hover};
  }

  &:focus-within {
    outline: none !important;
    border: 1px solid ${({ theme }) => theme.accent.primary};
    box-shadow: 0 0 10px ${({ theme }) => theme.accent.soft};
  }

  .overlay {
    position: absolute;
    inset: 0;
    cursor: not-allowed;
  }

  .comment-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
`;

const StyledSubmitButton = styled(Button)`
  font-size: 0.85em;
  border-radius: 50px;
  box-shadow: none;
  border: none;
  font-weight: 600;

  &:disabled {
    background-color: ${({ theme }) => theme.accent.muted};
    color: ${({ theme }) => theme.text.muted};
  }
`;

const StyledLink = styled(Button)`
  text-decoration: none;
`;

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1em;
`;

const StyledContentLimitCounter = styled.span<
  React.ComponentPropsWithoutRef<'span'> & {
    $status: 'ok' | 'danger';
  }
>`
  color: ${({ theme, $status }) => {
    switch ($status) {
      case 'ok':
        return theme.text.muted;
      case 'danger':
        return theme.accent.hover;
      default:
        return theme.text.muted;
    }
  }};
`;

export function CommentForm({
  isLocked,
  onSubmit,
}: {
  isLocked: boolean;
  onSubmit: (comment: string) => void;
}) {
  const [openDialog, setOpenDialog] = useState(false);
  const [content, setContent] = useState('');

  const contentPresent = (content.match(/\S+/)?.length ?? 0) > 0;

  return (
    <StyledCommentForm
      onSubmit={(e) => {
        e.preventDefault();
        return onSubmit(content);
      }}
    >
      <StyledTextAreaWrapper title={isLocked ? 'Login to comment' : undefined}>
        <StyledTextArea
          rows={3}
          disabled={isLocked}
          placeholder="Add comment..."
          value={content}
          minLength={COMMENT_CONSTRAINTS.MIN_CONTENT_LENGTH}
          maxLength={COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH}
          onChange={(e) => setContent((e.target as any).value)}
        />

        {isLocked && (
          <div
            className="overlay"
            data-testid="locked-comment-overlay"
            onClick={() => setOpenDialog(true)}
          />
        )}

        <div className="comment-actions">
          {!isLocked && (
            <StyledSubmitButton disabled={!contentPresent} type="submit">
              Submit
            </StyledSubmitButton>
          )}
          <StyledContentLimitCounter
            $status={
              content.length === COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH
                ? 'danger'
                : 'ok'
            }
          >{`${content.length} / ${COMMENT_CONSTRAINTS.MAX_CONTENT_LENGTH}`}</StyledContentLimitCounter>
        </div>
      </StyledTextAreaWrapper>

      {openDialog && (
        <Modal open title="Login required" onClose={() => setOpenDialog(false)}>
          <StyledModalContent>
            Login to join the conversation
            <StyledLink
              forwardedAs={Link}
              to={'/login'}
              aria-label="Login to comment"
            >
              Sign in now
            </StyledLink>
          </StyledModalContent>
        </Modal>
      )}
    </StyledCommentForm>
  );
}

export default CommentForm;
