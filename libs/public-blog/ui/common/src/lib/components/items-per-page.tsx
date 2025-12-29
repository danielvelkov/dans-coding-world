import styled from 'styled-components';

// typescript doesn't infer the React select component
// attributes without this magic incantation
const StyledSelect = styled.select<React.ComponentPropsWithoutRef<'select'>>``;

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
  return (
    <StyledSelect defaultValue={currentValue}>
      {values.map((v) => (
        <option key={v} value={v} onClick={() => onItemSelect(v)}>
          {v}
        </option>
      ))}
    </StyledSelect>
  );
}

export default ItemsPerPage;
