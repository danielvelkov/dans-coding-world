import styled from 'styled-components';
import React from 'react';

const StyledGenericError = styled.main`
  display: flex;
  flex-direction: column;

  align-items: center;

  h1 {
    font-size: 6em;
    margin: 0;
    padding: 0;
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
