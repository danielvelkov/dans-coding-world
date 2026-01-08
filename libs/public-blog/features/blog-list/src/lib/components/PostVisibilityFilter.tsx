import { Dropdown } from '@dans-coding-world/public-blog-ui-common';
import { Visibility } from '../types/post-item-data.type';

export function PostVisibilityFilter({
  currentValue,
  onChange,
}: {
  currentValue: Visibility[keyof Visibility][];
  onChange: (values: Visibility[keyof Visibility][]) => void;
}) {
  return (
    <Dropdown<Visibility[keyof Visibility], true>
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
    ></Dropdown>
  );
}
