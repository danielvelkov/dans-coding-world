import { useParams } from 'react-router-dom';

// TODO:
export function Post() {
  const { postId } = useParams<{ postId: string }>();
  return <h1>POST ID: {postId}</h1>;
}

export default Post;
