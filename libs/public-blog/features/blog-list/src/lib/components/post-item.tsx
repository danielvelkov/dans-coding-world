import styled from 'styled-components';
import { BlogPostItem } from '../types/post-item-data.types';
import {
  formatDateTo_DD_MMM_YYYY,
  getFirstParagraph,
} from '../helper/post-content.util';
import React from 'react';

const StyledListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>`
  padding: 0.5em 1em;
  border: 2px solid #ddd;

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
`;

export function PostItem({
  post,
  onTagClick,
  onAuthorClick,
  isLocked,
}: {
  post: BlogPostItem;
  onTagClick: (tagName: string) => void;
  onAuthorClick: (id: number) => void;
  isLocked: boolean;
}) {
  const { author, ...postData } = post;

  const excerpt = getFirstParagraph(postData.content);
  const authorName = author.profile
    ? `${author.profile.firstName} ${author.profile.lastName}`
    : author.username;
  const formattedPublishedDate = formatDateTo_DD_MMM_YYYY(postData.publishedAt);
  const formattedUpdatedDate = formatDateTo_DD_MMM_YYYY(postData.updatedAt);

  return (
    <StyledListItem>
      <article className="post">
        <h2 className="title">{postData.title}</h2>
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
          <p className="login-message">Login to read members-only post</p>
        ) : (
          <p className="excerpt">{excerpt}</p>
        )}
      </article>
    </StyledListItem>
  );
}
