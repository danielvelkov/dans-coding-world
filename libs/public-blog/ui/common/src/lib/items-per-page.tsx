import styled from 'styled-components';

// typescript doesn't infer the React select component
// attributes without this magic incantation
const StyledSelect = styled.select<React.ComponentPropsWithoutRef<'select'>>``;

export function ItemsPerPage({
  values,
  currentValue,
  onItemSelect,
}: {
  values: number[];
  currentValue: number;
  onItemSelect: (quantity: number) => void;
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
