import styled from 'styled-components';

const StyledTagButton = styled.button<
  React.ComponentPropsWithoutRef<'button'> & { $active: boolean }
>`
  font-size: 0.75em;
  padding: 0.3em 0.5em;
  font-weight: 750;
  letter-spacing: 0.04em;
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 5px;
  text-transform: lowercase;
  color: ${({ theme, $active }) =>
    $active ? theme.text.primary : theme.text.secondary};

  ${({ theme, $active }) =>
    $active
      ? `background:${theme.accent.primary}`
      : `background:${theme.background.surface}`};

  ::before {
    content: '#';
  }
  &:hover {
    background-color: ${({ theme }) => theme.accent.hover};
    color: ${({ theme }) => theme.text.primary};
  }
`;

export function Tag({
  isActive,
  name,
  onClick,
  className,
}: {
  isActive: boolean;
  name: string;
  onClick: (tagName: string) => void;
  className?: string;
}) {
  return (
    <StyledTagButton
      className={className}
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
