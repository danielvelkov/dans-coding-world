import styled from 'styled-components';

const StyledButton = styled.button<React.ComponentPropsWithRef<'button'>>`
  font-family: inherit;
  border-radius: 6px;
  font-size: 1em;
  padding: 0.5em 2em;
  color: ${({ theme }) => theme.background.elevated};
  box-shadow: 1px 1px ${({ theme }) => theme.accent.soft};
  border-color: ${({ theme }) => theme.border.primary};
  background: ${({ theme }) => theme.accent.primary};

  &:hover {
    background-color: ${({ theme }) => theme.accent.hover};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.accent.soft};
  }
`;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, ...rest }: ButtonProps) {
  return <StyledButton {...rest}>{children}</StyledButton>;
}

export default Button;
