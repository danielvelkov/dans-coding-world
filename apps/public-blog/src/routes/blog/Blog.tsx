import { BlogList } from '@dans-coding-world/public-blog-features-blog-list';
import { BlogSidebar } from '@dans-coding-world/public-blog-features-blog-sidebar';
import { usePostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';
import styled from 'styled-components';
const StyledBlogRootLayout = styled.div`
  display: flex;
  gap: 1em;
  @media (max-width: 900px) {
    flex-wrap: wrap;
  }
`;

const StyledBlogList = styled(BlogList)`
  flex: 4 1 60vw;
  padding: 0;

  @media (max-width: 900px) {
    flex: 1 0 100%;
  }
`;

const StyledStickyBlogSidebar = styled(BlogSidebar)`
  position: sticky;
  top: 0;
  flex: 1 1 20vw;
  align-self: flex-start;
  margin-bottom: 5em;

  @media (max-width: 900px) {
    position: static; /* disable sticky on mobile */
    flex: 1 0 100%;
    margin-bottom: 1em;
    order: -1; /* move ABOVE content */
  }
`;

export function Blog() {
  const { queryParams, setQueryParams } = usePostsQueryParams();

  return (
    <StyledBlogRootLayout>
      <StyledBlogList
        params={queryParams}
        setParams={setQueryParams}
      ></StyledBlogList>
      <StyledStickyBlogSidebar
        params={queryParams}
        setParams={setQueryParams}
      ></StyledStickyBlogSidebar>
    </StyledBlogRootLayout>
  );
}

export default Blog;
