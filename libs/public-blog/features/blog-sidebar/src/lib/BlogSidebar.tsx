import {
  useFetchTags,
  useFetchPostsMetadata,
  FetchPostsQueryParams,
} from '@dans-coding-world/public-blog-shared-hooks';
import { TagSelectSection } from './components/TagSelectSection';
import { PostYearSelection } from './components/PostYearSelection';
import { noop, UseQueryResult } from '@tanstack/react-query';
import { ShimmerFilters } from './components/ShimmerFilters';
import styled from 'styled-components';
import React from 'react';
import {
  GetPostsMetadataResponse,
  GetTagsResponse,
} from '@dans-coding-world/shared-post-dto';

const StyledAside = styled.aside<React.ComponentPropsWithoutRef<'aside'>>`
  display: flex;
  flex-direction: column;

  > *:not(:last-child) {
    padding-bottom: 1em;
    border-bottom: 1px solid #e5e7eb;
  }

  .hint {
    font-size: 0.9rem;
    color: #9ca3af; /* gray-400 */
    text-align: center;
    padding: 0.75rem 0;
    padding-bottom: 1em;
    border-bottom: 1px solid #e5e7eb;
  }
`;

export function BlogSidebar({
  params = {},
  setParams = noop,
  className,
}: {
  params?: FetchPostsQueryParams;
  setParams?: (value: FetchPostsQueryParams) => void;
  className?: string;
}) {
  const tagsQuery = useFetchTags();
  const yearsQuery = useFetchPostsMetadata();

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

  const isLoading = tagsQuery.isLoading || yearsQuery.isLoading;
  const hasTags = Boolean(tagsQuery.data?.count);
  const hasYears = Boolean(yearsQuery.data?.years.length);
  const hasAnyFilters = hasTags || hasYears;

  return (
    <StyledAside className={className} data-test="sidebar">
      {isLoading && <ShimmerFilters />}

      {!isLoading && (
        <>
          <TagSelectSection
            activeTags={params.filterBy?.tags}
            onTagToggle={handleTagToggle}
            tagsQuery={tagsQuery as UseQueryResult<GetTagsResponse>}
          />

          <PostYearSelection
            selectedYear={params.filterBy?.year}
            onYearToggle={handleYearToggle}
            yearsQuery={yearsQuery as UseQueryResult<GetPostsMetadataResponse>}
          />

          {!hasAnyFilters && (
            <p className="hint">No filter options available</p>
          )}
        </>
      )}
    </StyledAside>
  );
}

export default BlogSidebar;
