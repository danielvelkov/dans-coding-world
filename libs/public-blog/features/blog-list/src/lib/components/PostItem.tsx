import styled from 'styled-components';
import { randParagraph } from '@ngneat/falso';
import { BlogPostItem } from '../types/post-item-data.type';
import { getExcerpt } from '../util/post-content.util';
import { formatDateTo_DD_MMM_YYYY } from '@dans-coding-world/helpers';
import React from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '@dans-coding-world/public-blog-ui-common';

const StyledListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  padding: 0.5em 1em;
  border: 2px solid ${({ theme }) => theme.border.primary};
  border-radius: 8px;
  background: ${({ theme }) => theme.background.surface};

  .details,
  .tag-list,
  .author {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }

  .details,
  .author {
    gap: 0.8em;
    color: ${({ theme }) => theme.text.secondary};
    font-size: small;
  }

  .tag-list {
    gap: 5px;
  }

  a {
    color: ${({ theme }) => theme.text.primary};
    text-decoration: none;
  }

  .author-name {
    font-family: inherit;
    background: inherit;
    padding: 0;
    cursor: pointer;
  }

  .author-name:hover {
    color: ${({ theme }) => theme.accent.hover};
  }

  .image-container {
    display: flex;
    justify-content: center;
    cursor: pointer;
  }

  .image-container > img {
    max-height: 4ch;
  }

  .locked-container {
    position: relative;
    margin-top: 1rem;
  }

  .blurred-text {
    user-select: none;
    filter: blur(2px);
  }

  .lock-overlay {
    position: absolute;
    top: -1em;
    left: -1em;
    right: -1em;
    bottom: -1.5em;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      to bottom,
      transparent,
      ${({ theme }) => theme.background.surface} 100%
    );
    gap: 10px;
    padding-top: 10px;
  }

  .lock-badge {
    background: ${({ theme }) => theme.background.elevated};
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid ${({ theme }) => theme.background.inverse};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    font-weight: bold;
    font-size: small;
    display: flex;
    align-items: center;
    gap: 8px;
    color: ${({ theme }) => theme.accent.primary};
  }

  .more-link {
    display: inline-block;
    letter-spacing: 1px;
    padding: 0.5em 2.5em;
    background-color: ${({ theme }) => theme.accent.primary};
    width: fit-content;
    line-height: 2em;
    font-weight: 600;
    margin: 0.5em 0em;
    font-size: small;
    text-transform: uppercase;
  }

  .more-link:hover {
    background-color: ${({ theme }) => theme.accent.hover};
  }
`;

export function PostItem({
  post,
  isLocked,
  onTagClick,
  activeTags = [],
}: {
  post: BlogPostItem;
  isLocked: boolean;
  onTagClick: (tagName: string) => void;
  activeTags?: string[];
}) {
  const { author, ...postData } = post;

  const excerpt = getExcerpt(postData.content) + '...';
  const authorName = author.profile
    ? `${author.profile.firstName} ${author.profile.lastName}`
    : author.username;
  const formattedPublishedDate = formatDateTo_DD_MMM_YYYY(
    new Date(postData.publishedAt)
  );
  const formattedUpdatedDate = formatDateTo_DD_MMM_YYYY(
    new Date(postData.updatedAt)
  );

  return (
    <StyledListItem>
      <article className="post" aria-label={`Blog post: ${post.title}`}>
        <h2 className="title">
          {isLocked ? (
            post.title
          ) : (
            <Link to={`/blog/${post.id}`}>{post.title}</Link>
          )}
        </h2>
        <div className="details">
          <Link
            className="author"
            to={`/users/${post.author.id}`}
            aria-label={`View profile of ${authorName}`}
          >
            <div className="image-container">
              {author.profile && author.profile.avatarURL ? (
                <img
                  src={author.profile.avatarURL}
                  alt={`${authorName}'s avatar`}
                />
              ) : (
                <i
                  className="fa fa-regular fa-user"
                  aria-label="Default user avatar"
                ></i>
              )}
            </div>
            <span className="author-name">
              {`By `}
              <em>{authorName}</em>
            </span>
          </Link>
          {' • '}
          <time dateTime={new Date(postData.publishedAt).toISOString()}>
            {`Posted on ${formattedPublishedDate}`}
          </time>
          {formattedPublishedDate !== formattedUpdatedDate ? (
            <>
              {' • '}
              <time dateTime={new Date(postData.updatedAt).toISOString()}>
                {`Edited on ${formattedUpdatedDate}`}
              </time>
            </>
          ) : (
            ''
          )}
          <div className="tag-list" role="group" aria-label="Post tags">
            {postData.tags &&
              postData.tags.map((tagName) => {
                const isActive = activeTags.includes(tagName);
                return (
                  <Tag
                    key={`${post.id}-${tagName}`}
                    isActive={isActive}
                    name={tagName}
                    onClick={onTagClick}
                  />
                );
              })}
          </div>
        </div>
        {isLocked ? (
          <div className="locked-container">
            <p className="blurred-text" aria-hidden="true">
              {randParagraph({ length: 3 })}
            </p>
            <div
              className="lock-overlay"
              role="status"
              aria-label="This post is members only"
            >
              <Link
                to={`/login`}
                aria-label="Login to view members only content"
              >
                <span className="lock-badge" aria-hidden="true">
                  <i className="fa fa-lock" />
                  Members Only
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="excerpt">{excerpt}</p>
            <Link className="more-link" to={`/blog/${post.id}`}>
              Continue reading
            </Link>
          </>
        )}
      </article>
    </StyledListItem>
  );
}
