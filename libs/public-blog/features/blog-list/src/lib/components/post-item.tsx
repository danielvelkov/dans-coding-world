import styled from 'styled-components';
import { PostItemData } from '../types/post-item-data.types';
import { getFirstParagraph } from '../helper/post-content.util';

const StyledListItem = styled.li`
  color: black;
`;

export function PostItem({ post }: { post: PostItemData }) {
  const excerpt = getFirstParagraph(post.content);

  return (
    <StyledListItem>
      <article>
        <h3>{post.title}</h3>
        <p>{excerpt}</p>
      </article>
    </StyledListItem>
  );
}
