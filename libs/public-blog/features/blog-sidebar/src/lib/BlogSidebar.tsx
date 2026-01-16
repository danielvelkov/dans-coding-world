import {
  useFetchTags,
  useFetchPostsMetadata,
  FetchPostsQueryParams,
} from '@dans-coding-world/public-blog-shared-hooks';
import { TagSelectSection } from './components/TagSelectSection';
import { PostYearSelection } from './components/PostYearSelection';
import { noop, UseQueryResult } from '@tanstack/react-query';
import {
  GetPostsMetadataResponse,
  GetTagsResponse,
} from '@dans-coding-world/shared-post-dto';

export function BlogSidebar({
  params = {},
  setParams = noop,
  className,
}: {
  params?: FetchPostsQueryParams;
  setParams?: (value: FetchPostsQueryParams) => void;
  className?: string;
}) {
  const tagsQueryRes = useFetchTags();
  const postsMetadataQueryRes = useFetchPostsMetadata();

  const handleTagToggle = (tagName: string) => {
    const currentTags = params.filterBy?.tags || [];
    const nextTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];

    setParams({
      ...params,
      filterBy: { ...params.filterBy, tags: nextTags },
    });
  };

  const handleYearToggle = (year: number) => {
    const currentYear = params.filterBy?.year
      ? Number(params.filterBy.year)
      : undefined;
    const nextYear = currentYear === year ? undefined : year;

    setParams({
      ...params,
      filterBy: { ...params.filterBy, year: nextYear },
    });
  };

  return (
    <aside className={className}>
      <TagSelectSection
        activeTags={params.filterBy?.tags}
        onTagToggle={handleTagToggle}
        tagsQuery={tagsQueryRes as UseQueryResult<GetTagsResponse>}
      />

      <PostYearSelection
        selectedYear={params.filterBy?.year}
        onYearToggle={handleYearToggle}
        yearsQuery={
          postsMetadataQueryRes as UseQueryResult<GetPostsMetadataResponse>
        }
      />
      {tagsQueryRes.data || postsMetadataQueryRes.data ? <hr /> : undefined}
    </aside>
  );
}

export default BlogSidebar;
