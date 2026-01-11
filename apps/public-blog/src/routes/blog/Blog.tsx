import { BlogList } from '@dans-coding-world/public-blog-features-blog-list';
import { useSearchParams } from 'react-router-dom';
import qs from 'qs';

type BlogListParams = Parameters<typeof BlogList>[0]['params'];

export function Blog() {
  const [searchParams, setSearchParams] = useSearchParams();
  let queryParams: BlogListParams = qs.parse(searchParams.toString());

  if (!queryParams) queryParams = {};

  // Default filters
  queryParams = {
    sortBy: { publishedAt: 'desc' },
    ...queryParams,
    filterBy: {
      status: ['PUBLISHED'],
      visibility: ['MEMBERS_ONLY', 'PUBLIC'],
      ...queryParams.filterBy,
    },
  };

  return (
    <BlogList
      params={queryParams}
      setParams={(value) => {
        const filteredValues = removeDefaultParamsFromURL(value);
        setSearchParams(qs.stringify(filteredValues));
      }}
    />
  );
}

const removeDefaultParamsFromURL = (value: NonNullable<BlogListParams>) => {
  const filteredValues = {
    ...value,
    sortBy: value.sortBy ? { ...value.sortBy } : undefined,
    filterBy: value.filterBy ? { ...value.filterBy } : undefined,
  };

  if (filteredValues.sortBy?.publishedAt === 'desc')
    delete filteredValues.sortBy.publishedAt;
  if (filteredValues.filterBy?.status) delete filteredValues.filterBy.status;
  if (
    filteredValues.filterBy?.visibility?.includes('MEMBERS_ONLY') &&
    filteredValues.filterBy?.visibility?.includes('PUBLIC')
  )
    delete filteredValues.filterBy.visibility;
  return filteredValues;
};

export default Blog;
