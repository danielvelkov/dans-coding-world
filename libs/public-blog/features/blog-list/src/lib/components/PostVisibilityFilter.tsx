import { Dropdown } from '@dans-coding-world/public-blog-ui-common';
import { Visibility } from '../types/post-item-data.type';

export function PostVisibilityFilter({
  currentValue,
  onChange,
  className,
}: {
  currentValue: Visibility[keyof Visibility][];
  onChange: (values: Visibility[keyof Visibility][]) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor="type-filter">Type</label>
      <Dropdown<Visibility[keyof Visibility], true>
        id={'type-filter'}
        currentValue={currentValue}
        onItemSelect={(values) => onChange(values)}
        isMulti
        values={[
          {
            value: 'PUBLIC',
            label: 'Public',
          },
          {
            value: 'MEMBERS_ONLY',
            label: 'Members-only',
          },
        ]}
        isClearable={false}
        hideRemoveOption={currentValue.length === 1}
      ></Dropdown>
    </div>
  );
}
