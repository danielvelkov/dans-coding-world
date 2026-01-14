import styled from 'styled-components';

const StyledTagButton = styled.button<
  React.ComponentPropsWithoutRef<'button'> & { $active: boolean }
>`
  font-size: 0.75em;
  padding: 0.3em 0.5em;
  font-weight: 600;
  border: 2px solid white;
  border-radius: 2em;
  text-transform: lowercase;

  ${(props) => (props.$active ? 'background: #bea0c9' : '')};

  ::before {
    content: '#';
  }
`;

export function Tag({
  isActive,
  name,
  onClick,
}: {
  isActive: boolean;
  name: string;
  onClick: (tagName: string) => void;
}) {
  return (
    <StyledTagButton
      $active={isActive}
      onClick={() => onClick(name)}
      aria-pressed={isActive}
      aria-label={`${isActive ? 'Remove' : 'Add'} ${name} filter`}
    >
      {`${name}`}
    </StyledTagButton>
  );
}

export default Tag;
