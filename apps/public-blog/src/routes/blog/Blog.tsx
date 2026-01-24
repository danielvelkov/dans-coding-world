import { BlogList } from '@dans-coding-world/public-blog-features-blog-list';
import { BlogSidebar } from '@dans-coding-world/public-blog-features-blog-sidebar';
import { usePostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';
import styled from 'styled-components';

const StyledBlogRootLayout = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
`;
const StyledBlogList = styled(BlogList)`
  flex: 4 0 35vmax;
  padding: 0;
`;
const StyledStickyBlogSidebar = styled(BlogSidebar)`
  position: sticky;
  top: 0;
  flex: 1 0 200px;
  align-self: flex-start;
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
