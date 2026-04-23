import { useParams } from 'react-router-dom';
import { BlogPost } from '@dans-coding-world/public-blog-features-blog-post';
import styled from 'styled-components';

const StyledBlogPost = styled(BlogPost)`
  max-width: 900px;
  margin: 0 auto;
`;

export function Post() {
  const { postId } = useParams<{ postId: string }>();
  if (!postId || !Number.isInteger(+postId)) throw new Error('Invalid post id');

  return (
    <main>
      <StyledBlogPost postId={+postId}></StyledBlogPost>
    </main>
  );
}

export default Post;
