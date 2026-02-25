import { Dropdown } from '@dans-coding-world/public-blog-ui-common';
import { PAGINATION } from '@dans-coding-world/shared-constants';

export type PostItemOption =
  (typeof PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS)[number];

export function PostItemsPerPage({
  currentValue,
  onChange,
  className,
}: {
  currentValue?: number;
  onChange: (value: PostItemOption) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor="items-per-page">Items per page</label>
      <Dropdown<PostItemOption>
        id="items-per-page"
        values={PAGINATION.POSTS.ITEMS_PER_PAGE_OPTIONS.map((value) => ({
          value,
          label: value.toString(),
        }))}
        currentValue={
          (currentValue as PostItemOption) ??
          PAGINATION.POSTS.DEFAULT_ITEMS_PER_PAGE
        }
        onItemSelect={onChange}
      />
    </div>
  );
}
