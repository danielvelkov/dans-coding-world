import styled from 'styled-components';
import React from 'react';

const StyledGenericError = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-height: 50vh;
  padding: 2rem 1rem;
  text-align: center;

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 0.5rem;
    color: ${({ theme }) => theme.text.primary};
  }

  h2 {
    font-size: 1.4rem;
    font-weight: 300;
    margin: 0 0 1.5rem;
    color: ${({ theme }) => theme.text.secondary};
  }
`;

type GenericErrorProps = React.HTMLAttributes<HTMLDivElement> & {
  errorTitle: string;
  subtitle: string;
};

export function GenericError({
  errorTitle,
  subtitle,
  children,
}: GenericErrorProps) {
  return (
    <StyledGenericError>
      <h1>{errorTitle}</h1>
      <h2>{subtitle}</h2>
      {children}
    </StyledGenericError>
  );
}

export default GenericError;
