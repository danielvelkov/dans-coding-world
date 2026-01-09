import styled from 'styled-components';
import { randParagraph } from '@ngneat/falso';
import { BlogPostItem } from '../types/post-item-data.type';
import {
  formatDateTo_DD_MMM_YYYY,
  getFirstParagraph,
} from '../util/post-content.util';
import React from 'react';
import { Link } from 'react-router-dom';

const StyledListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  padding: 0.5em 1em;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f3f3f3;

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
    color: inherit;
  }

  .tag {
    font-size: 0.75em;
    padding: 0.3em 0.5em;
    font-weight: 600;
    border-radius: 2em;
  }

  .tag-list {
    gap: 5px;
  }

  .active-tag {
    background-color: #bea0c9;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .author-name {
    font-family: inherit;
    background: inherit;
    padding: 0;
    cursor: pointer;
    font-size: 1em;
  }

  .author-name:hover {
    color: #4c7cd5;
  }

  .image-container {
    display: flex;
    justify-content: center;
    cursor: pointer;
  }

  .image-container > img {
    max-height: 4ch;
  }

  .excerpt {
    color: #e8e6e3;
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
    background: linear-gradient(to bottom, transparent, #ffffff 100%);
    gap: 10px;
    padding-top: 10px;
  }

  .lock-badge {
    background: #fff;
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid #ddd;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    font-weight: bold;
    font-size: small;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #333;
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

  const excerpt = getFirstParagraph(postData.content) + '...';
  const authorName = author.profile
    ? `${author.profile.firstName} ${author.profile.lastName}`
    : author.username;
  const formattedPublishedDate = formatDateTo_DD_MMM_YYYY(postData.publishedAt);
  const formattedUpdatedDate = formatDateTo_DD_MMM_YYYY(postData.updatedAt);

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
              <time dateTime={postData.updatedAt.toISOString()}>
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
                  <button
                    key={`${post.id}-${tagName}`}
                    onClick={() => onTagClick(tagName)}
                    className={`tag link-button ${
                      isActive ? 'active-tag' : ''
                    }`}
                    aria-pressed={isActive}
                    aria-label={`${
                      isActive ? 'Remove' : 'Add'
                    } ${tagName} filter`}
                  >
                    {`#${tagName}`}
                  </button>
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
          <p className="excerpt">{excerpt}</p>
        )}
      </article>
    </StyledListItem>
  );
}
