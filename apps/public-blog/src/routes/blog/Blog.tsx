import { BlogList } from '@dans-coding-world/public-blog-features-blog-list';
import { BlogSidebar } from '@dans-coding-world/public-blog-features-blog-sidebar';
import { useSearchParams } from 'react-router-dom';
import { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';
import qs from 'qs';
import styled from 'styled-components';
import { mergePostQueryDefaults } from './utils/merge-post-query-defaults';
import { stripDefaultPostQueryParams } from './utils/strip-default-post-query-params';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedParams: FetchPostsQueryParams = qs.parse(searchParams.toString());
  const queryParams = mergePostQueryDefaults(parsedParams || {});

  const handleParamsChange = (value: FetchPostsQueryParams) => {
    const filteredValues = stripDefaultPostQueryParams(value);
    setSearchParams(qs.stringify(filteredValues));
  };

  return (
    <StyledBlogRootLayout>
      <StyledBlogList
        params={queryParams}
        setParams={handleParamsChange}
      ></StyledBlogList>
      <StyledStickyBlogSidebar
        params={queryParams}
        setParams={handleParamsChange}
      ></StyledStickyBlogSidebar>
    </StyledBlogRootLayout>
  );
}

export default Blog;
