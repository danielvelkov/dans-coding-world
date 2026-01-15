import { Tag } from '@dans-coding-world/public-blog-ui-common';
import { UseQueryResult } from '@tanstack/react-query';
import { GetTagsResponse } from '@dans-coding-world/shared-post-dto';
import styled from 'styled-components';

const StyledTag = styled(Tag)`
  margin-right: 0.5em;
  margin-top: 0.5em;
`;

export function TagSelectSection({
  tagsQuery,
  activeTags = [],
  onTagToggle,
}: {
  tagsQuery: UseQueryResult<GetTagsResponse>;
  activeTags?: string[];
  onTagToggle: (tagName: string) => void;
}) {
  const { data, isLoading, isError } = tagsQuery;

  if (isLoading || isError || !data || data.count === 0) {
    return null;
  }

  return (
    <section aria-labelledby="tag-filter-heading">
      <h3 id="tag-filter-heading">Tags</h3>

      {data.items.map(({ name }) => (
        <StyledTag
          key={name}
          name={name}
          isActive={activeTags.includes(name)}
          onClick={onTagToggle}
        />
      ))}
    </section>
  );
}
