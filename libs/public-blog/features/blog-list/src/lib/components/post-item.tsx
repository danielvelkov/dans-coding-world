import styled from 'styled-components';
import { BlogPostItem } from '../types/post-item-data.types';
import {
  formatDateTo_DD_MMM_YYYY,
  getFirstParagraph,
} from '../helper/post-content.util';
import React from 'react';

const StyledListItem = styled.li<React.ComponentPropsWithoutRef<'li'>>``;

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
          >{`By ${authorName}`}</button>
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
