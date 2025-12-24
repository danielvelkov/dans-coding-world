import styled from 'styled-components';
import { PostItemData } from '../types/post-item-data.types';
import {
  formatDateTo_DD_MMM_YYYY,
  getFirstParagraph,
} from '../helper/post-content.util';

const StyledListItem = styled.li`
  color: black;
`;

export function PostItem({
  post,
  onTagClick,
  onAuthorClick,
  isLocked,
}: {
  post: PostItemData;
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

  return (
    <StyledListItem>
      <article className="post">
        <h3 className="title">{postData.title}</h3>
        <div>
          <button
            onClick={() => onAuthorClick(author.id)}
            className="author-name"
          >{`By ${authorName}`}</button>
          {' | '}
          <span className="published-date">{formattedPublishedDate}</span>
          {' | '}
          <div>
            {postData.tags &&
              postData.tags.map((tagName) => (
                <button onClick={() => onTagClick(tagName)} className="tag">
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
