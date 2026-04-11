import styled from 'styled-components';

const StyledInput = styled.input<React.ComponentPropsWithRef<'input'>>`
  font-family: inherit;
  border-radius: 6px;
  font-size: 1em;
  padding: 0.5em 1em;
  color: ${({ theme }) => theme.text.primary};
  box-shadow: 1px 1px ${({ theme }) => theme.accent.soft};
  border-color: ${({ theme }) => theme.border.primary};
  background-color: ${({ theme }) => theme.background.surface};

  &:hover {
    border-color: ${({ theme }) => theme.border.hover};
  }
`;

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ children, ...rest }: InputProps) {
  return <StyledInput {...rest}>{children}</StyledInput>;
}

export default Input;
