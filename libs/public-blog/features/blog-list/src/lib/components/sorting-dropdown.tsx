import Select from 'react-select';
import { GetPostsDto } from '@dans-coding-world/shared-post-dto';
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

export function SortingDropdown({
  onChange,
}: {
  onChange: (value?: PostSorting) => void;
}) {
  return (
    <Select<SortOption>
      onChange={(i) => onChange(i?.value)}
      styles={{
        control: (base, state) => ({
          ...base,
          padding: '0.5em',
          fontSize: '1em',
          backgroundColor: '#f5f5f5',
          borderWidth: '2px',
          borderColor: state.isFocused ? '#4a90e2' : '#ccc',
          boxShadow: state.isFocused
            ? '0 0 0 2px rgba(74,144,226,0.2)'
            : 'none',
          '&:hover': { borderColor: '#999' },
        }),
      }}
      defaultValue={SORT_OPTIONS[0]}
      options={SORT_OPTIONS}
    ></Select>
  );
}
