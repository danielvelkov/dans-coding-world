import { useFetchPost } from '@dans-coding-world/public-blog-shared-hooks';

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
        </article>
      )}
    </main>
  );
}

export default BlogPost;
