import { formatToRelativeTimeFromNow } from '@dans-coding-world/helpers';
import { CommentWithReplies } from '@dans-coding-world/prisma-schema';
import { UserAvatar } from '@dans-coding-world/public-blog-ui-common';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const StyledLink = styled(Link)`
  color: inherit;
  font-style: inherit;
  text-decoration: none;
`;

export const StyledComment = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  padding: 0.5em 0;
  width: 100%;
  display: flex;
  gap: 1em;

  p {
    margin-top: 0.5em;
    margin-bottom: 0;
    word-wrap: break-word;
    line-height: 1.5;
  }

  .author-avatar {
    flex-shrink: 0;
  }

  .comment-content {
    flex: 1;
  }

  .comment-details {
    display: flex;
    color: ${({ theme }) => theme.text.secondary};
    font-size: 0.9em;
    gap: 0.75em;
    align-items: baseline;
  }

  ${StyledLink}:not(.author-avatar):hover {
    color: ${({ theme }) => theme.accent.hover};
    text-decoration: underline;
  }
`;

export function Comment({
  comment,
  className,
}: {
  comment: CommentWithReplies;
  className?: string;
}) {
  const authorName = comment.user.profile
    ? `${comment.user.profile.firstName} ${comment.user.profile.lastName}`
    : comment.user.username;

  return (
    <StyledComment className={className}>
      <StyledLink
        className="author-avatar"
        to={`/users/${comment.userId}`}
        aria-label={`View profile of ${authorName}`}
      >
        <UserAvatar
          avatarURL={comment.user.profile?.avatarURL}
          name={authorName}
          size={'M'}
        ></UserAvatar>
      </StyledLink>

      <div className="comment-content">
        <div className="comment-details">
          <StyledLink
            to={`/users/${comment.userId}`}
            aria-label={`View profile of ${authorName}`}
          >
            <b>{authorName}</b>
          </StyledLink>

          <time
            dateTime={new Date(comment.createdAt).toISOString()}
            title={new Date(comment.createdAt).toDateString()}
          >
            {formatToRelativeTimeFromNow(new Date(comment.createdAt))}
          </time>
        </div>

        <p>{comment.content}</p>
      </div>
    </StyledComment>
  );
}

export default Comment;
