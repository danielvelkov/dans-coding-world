import Select, { MultiValue, SingleValue } from 'react-select';

interface Option<T> {
  value: T;
  label: string;
}

interface DropdownProps<T, isMultiSelect extends boolean = false> {
  values: Option<T>[];
  currentValue: isMultiSelect extends true ? T[] : T;
  onItemSelect: (option: isMultiSelect extends true ? T[] : T) => void;
  isMulti?: isMultiSelect;
}

export function Dropdown<T, IsMulti extends boolean = false>({
  values,
  currentValue,
  onItemSelect,
  isMulti,
}: DropdownProps<T, IsMulti>) {
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
      isMulti={isMulti}
      value={selectedOption}
      options={values}
      onChange={handleChange}
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
    />
  );
}

export default Dropdown;
