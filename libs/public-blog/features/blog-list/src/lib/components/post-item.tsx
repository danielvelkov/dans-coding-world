import styled from 'styled-components';
import { randParagraph } from '@ngneat/falso';
import { BlogPostItem } from '../types/post-item-data.types';
import {
  formatDateTo_DD_MMM_YYYY,
  getFirstParagraph,
} from '../helper/post-content.util';
import React from 'react';

const StyledListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  padding: 0.5em 1em;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f3f3f3;

  .details,
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    font-size: 0.99em;
  }

  .details {
    gap: 0.8em;
  }

  .tag-list {
    gap: 5px;
  }

  .link-button {
    border: none;
    padding: 5px;
    text-decoration: underline;
  }

  .title:hover {
    color: #4c7cd5;
    cursor: pointer;
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

  /* The New Locked Overlay */
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
  onTagClick,
  onAuthorClick,
  onClick,
  isLocked,
}: {
  post: BlogPostItem;
  onTagClick: (tagName: string) => void;
  onAuthorClick: (id: number) => void;
  onClick: (id: number) => void;
  isLocked: boolean;
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
      <article className="post">
        <h2 onClick={() => onClick(post.id)} className="title">
          {postData.title}
        </h2>
        <div className="details">
          <div
            className="image-container"
            onClick={() => onAuthorClick(author.id)}
          >
            {author.profile && author.profile.avatarURL ? (
              <img
                src={author.profile.avatarURL}
                alt={`${author.username}'s avatar`}
              ></img>
            ) : (
              <i className="fa fa-regular fa-user"></i>
            )}
          </div>
          <button
            onClick={() => onAuthorClick(author.id)}
            className="author-name link-button"
          >
            {`By `}
            <em>{authorName}</em>
          </button>
          {' • '}
          <span className="published-date">{`Posted on ${formattedPublishedDate}`}</span>
          {formattedPublishedDate !== formattedUpdatedDate ? (
            <>
              {' • '}
              <span className="updated-date">
                {`Edited on ${formattedUpdatedDate}`}
              </span>
            </>
          ) : (
            ''
          )}
          <div className="tag-list">
            {postData.tags &&
              postData.tags.map((tagName) => (
                <button
                  key={`${post.id}-${tagName}`}
                  onClick={() => onTagClick(tagName)}
                  className="tag link-button"
                >
                  {tagName}
                </button>
              ))}
          </div>
        </div>
        {isLocked ? (
          <div className="locked-container">
            <p className="blurred-text" aria-hidden="true">
              {randParagraph({ length: 3 })}
            </p>
            <div className="lock-overlay" title="Login to view">
              <span className="lock-badge">
                <i className="fa fa-lock" />
                Members Only
              </span>
            </div>
          </div>
        ) : (
          <p className="excerpt">{excerpt}</p>
        )}
      </article>
    </StyledListItem>
  );
}
