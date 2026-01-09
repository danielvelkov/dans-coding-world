import { GetPostsDto } from '@dans-coding-world/shared-post-dto';
import { Dropdown } from '@dans-coding-world/public-blog-ui-common';
type PostSorting = GetPostsDto['sortBy'];
type SortOption = { value: PostSorting; label: string };

const SORT_OPTIONS: SortOption[] = [
  {
    label: 'Published date (desc)',
    value: {
      publishedAt: 'desc',
    },
  },
  {
    label: 'Published date (asc)',
    value: {
      publishedAt: 'asc',
    },
  },
  {
    label: 'Last modified date (asc)',
    value: {
      updatedAt: 'asc',
    },
  },
  {
    label: 'Last modified date (desc)',
    value: {
      updatedAt: 'desc',
    },
  },
] as const;

export function PostSortingDropdown({
  currentValue,
  onChange,
  className,
}: {
  currentValue: PostSorting;
  onChange: (value?: PostSorting) => void;
  className?: string;
}) {
  const selectedOption =
    SORT_OPTIONS.find(
      ({ value }) => JSON.stringify(value) === JSON.stringify(currentValue)
    )?.value ?? SORT_OPTIONS[0].value;
  return (
    <div className={className}>
      <label htmlFor="sort-posts">Sort by</label>
      <Dropdown<PostSorting>
        values={SORT_OPTIONS}
        currentValue={selectedOption}
        onItemSelect={onChange}
        id="sort-posts"
      ></Dropdown>
    </div>
  );
}
