import styled from 'styled-components';
import { PostItemData } from '../types/post-item-data.types';
import {
  formatDateTo_DD_MMM_YYYY,
  getFirstParagraph,
} from '../helper/post-content.util';

const StyledListItem = styled.li`
  color: black;
`;

export function PostItem({ post }: { post: PostItemData }) {
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
          <span className="author-name">{`By ${authorName}`}</span>
          {' | '}
          <span className="published-date">{formattedPublishedDate}</span>
        </div>
        <p className="excerpt">{excerpt}</p>
      </article>
    </StyledListItem>
  );
}
