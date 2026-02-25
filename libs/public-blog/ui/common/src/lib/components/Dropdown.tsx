import Select, { MultiValue, SingleValue } from 'react-select';
import { useTheme } from 'styled-components';
import { Theme } from '@dans-coding-world/public-blog-ui-theme';

interface Option<T> {
  value: T;
  label: string;
}

interface DropdownProps<T, isMultiSelect extends boolean = false> {
  id?: string;
  values: Option<T>[];
  currentValue: isMultiSelect extends true ? T[] : T;
  onItemSelect: (option: isMultiSelect extends true ? T[] : T) => void;
  isMulti?: isMultiSelect;
  isClearable?: boolean;
  hideRemoveOption?: boolean;
}

export function Dropdown<T, IsMulti extends boolean = false>({
  id,
  values,
  currentValue,
  onItemSelect,
  isMulti,
  isClearable,
  hideRemoveOption,
}: DropdownProps<T, IsMulti>) {
  const theme: Theme = useTheme();

  const selectedOption = isMulti
    ? values.filter((opt) => (currentValue as T[]).includes(opt.value))
    : values.find((opt) => opt.value === currentValue) ?? null;

  const handleChange = (
    newValue: MultiValue<Option<T>> | SingleValue<Option<T>>
  ) => {
    if (isMulti) {
      const vals = (newValue as MultiValue<Option<T>>).map((v) => v.value);
      onItemSelect(vals as any);
    } else {
      const val = (newValue as SingleValue<Option<T>>)?.value;
      if (val !== undefined) onItemSelect(val as any);
    }
  };

  return (
    <Select
      inputId={id}
      isMulti={isMulti}
      value={selectedOption}
      options={values}
      onChange={handleChange}
      isClearable={isClearable}
      components={
        hideRemoveOption
          ? {
              MultiValueRemove: () => (
                <div style={{ padding: '0em 3px' }}></div>
              ),
            }
          : undefined
      }
      styles={{
        control: (base, state) => ({
          ...base,
          padding: '0.1em',
          backgroundColor: theme.background.surface,
          borderWidth: '2px',
          borderColor: state.isFocused
            ? theme.accent.primary
            : theme.border.primary,
          boxShadow: state.isFocused
            ? `0 0 0 2px ${theme.accent.muted}`
            : 'none',
          '&:hover': { borderColor: theme.border.hover },
        }),
        menu: (base) => ({
          ...base,
          backgroundColor: theme.background.elevated,
          border: `1px solid ${theme.border.primary}`,
          boxShadow: `0 4px 12px rgba(0,0,0,0.15)`,
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? theme.accent.primary
            : state.isFocused
            ? theme.accent.soft
            : 'transparent',
          color: state.isSelected ? '#fff' : theme.text.primary,
          '&:active': { backgroundColor: theme.accent.hover },
        }),
        singleValue: (base) => ({
          ...base,
          color: theme.text.primary,
        }),
        multiValue: (base) => ({
          ...base,
          backgroundColor: theme.accent.soft,
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: theme.text.primary,
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: theme.accent.primary,
          '&:hover': {
            backgroundColor: theme.accent.primary,
            color: '#fff',
          },
        }),
        placeholder: (base) => ({
          ...base,
          color: theme.text.muted,
        }),
        input: (base) => ({
          ...base,
          color: theme.text.primary,
        }),
        indicatorSeparator: (base) => ({
          ...base,
          backgroundColor: theme.border.primary,
        }),
        dropdownIndicator: (base, state) => ({
          ...base,
          color: state.isFocused ? theme.accent.primary : theme.text.muted,
          '&:hover': { color: theme.accent.primary },
        }),
        clearIndicator: (base) => ({
          ...base,
          color: theme.text.muted,
          '&:hover': { color: theme.accent.primary },
        }),
      }}
    />
  );
}

export default Dropdown;
