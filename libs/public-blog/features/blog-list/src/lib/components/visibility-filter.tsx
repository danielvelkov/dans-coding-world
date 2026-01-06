import Select from 'react-select';
import { Visibility } from '../types/post-item-data.types';
type VisibilityOption = { value: Visibility[keyof Visibility]; label: string };

export function VisibilityFilter({
  onChange,
}: {
  onChange: (values: Visibility[keyof Visibility][]) => void;
}) {
  return (
    <Select<VisibilityOption, true>
      onChange={(values) => onChange(values.map((v) => v.value))}
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
      isMulti
      options={[
        {
          value: 'PUBLIC',
          label: 'Public',
        },
        {
          value: 'MEMBERS_ONLY',
          label: 'Members-only',
        },
      ]}
    ></Select>
  );
}
