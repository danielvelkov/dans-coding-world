import { useFetchPost } from '@dans-coding-world/public-blog-shared-hooks';
import DOMPurify from 'dompurify';

export function BlogPost({ postId }: { postId: number }) {
  const { data, isPending, isError, error } = useFetchPost(postId);
  const showLoading = isPending || !data;

  return (
    <main>
      {/* Dynamic Content Area */}
      {isError ? (
        <span
          data-testid="error-message"
          style={{ padding: '1em', color: 'red' }}
        >
          {error.message}
        </span>
      ) : showLoading ? (
        <div>Loading</div>
      ) : (
        <article>
          <h1>{data.post.title}</h1>
          <div
            data-testid="post-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(data.post.content),
            }}
          ></div>
        </article>
      )}
    </main>
  );
}

export default BlogPost;
