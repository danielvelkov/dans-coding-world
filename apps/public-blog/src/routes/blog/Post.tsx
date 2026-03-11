import { useParams } from 'react-router-dom';
import { BlogPost } from '@dans-coding-world/public-blog-features-blog-post';
import styled from 'styled-components';

const StyledBlogPost = styled(BlogPost)``;

export function Post() {
  const { postId } = useParams<{ postId: string }>();
  if (!postId) throw new Error('Missing post id');

  return (
    <main>
      <StyledBlogPost postId={+postId}></StyledBlogPost>
    </main>
  );
}

export default Post;
