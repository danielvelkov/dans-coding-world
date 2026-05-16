import styled from 'styled-components';

const StyledActionButton = styled.button<
  React.ComponentPropsWithoutRef<'button'> & { $isOpen: boolean }
>`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text.secondary};
  font-weight: 600;
  cursor: pointer;
  padding: 0.5em 0.75em;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.background.elevated};
    color: ${({ theme }) => theme.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    transition: transform 0.2s ease;
    transform: ${({ $isOpen }) =>
      $isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

interface ActionButtonProps {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  disabled?: boolean;
  bannedMessage?: string;
  showCaret?: boolean;
  'aria-expanded'?: boolean;
}

export function ActionButton({
  label,
  isOpen,
  onClick,
  disabled,
  bannedMessage,
  showCaret,
  ...ariaProps
}: ActionButtonProps) {
  return (
    <StyledActionButton
      $isOpen={isOpen}
      onClick={onClick}
      disabled={disabled}
      aria-label={disabled ? bannedMessage : undefined}
      {...ariaProps}
    >
      {showCaret && <i className="fa fa-caret-down" />}
      {label}
    </StyledActionButton>
  );
}
