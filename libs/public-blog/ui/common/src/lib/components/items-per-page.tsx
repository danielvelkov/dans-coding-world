import { useEffect, useState } from 'react';
import styled from 'styled-components';

// typescript doesn't infer the React select component
// attributes without this magic incantation
const StyledSelect = styled.select<React.ComponentPropsWithoutRef<'select'>>`
  padding: 1em;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  color: #333;
  cursor: pointer;
`;

// By making this generic, when you pass your const array of values
// it automatically  makes the other params take only values of that arr
export function ItemsPerPage<T extends number | string>({
  values,
  currentValue,
  onItemSelect,
}: {
  values: readonly T[];
  currentValue: T;
  onItemSelect: (value: T) => void;
}) {
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  return (
    <StyledSelect
      value={value}
      aria-label="items per page"
      onChange={(e) => {
        setValue(e.target.value as T);
        onItemSelect(e.target.value as T);
      }}
    >
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </StyledSelect>
  );
}

export default ItemsPerPage;
