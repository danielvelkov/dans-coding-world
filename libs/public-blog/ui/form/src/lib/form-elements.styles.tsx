import { Input, Button } from '@dans-coding-world/public-blog-ui-common';
import React from 'react';
import styled from 'styled-components';

type FieldErrorTextProps = React.PropsWithChildren<
  React.ComponentPropsWithoutRef<'span'>
>;

export const FormContainer = styled.form<
  React.ComponentPropsWithoutRef<'form'>
>`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background-color: ${({ theme }) => theme.background.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 5px;
  padding: 2.5rem;
  margin: 2rem auto;
  max-width: 60ch;
`;

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: ${({ theme }) => theme.text.primary};
  }
`;

export const FormInput = styled(Input)<{ $hasError: boolean }>`
  width: 100%;
  transition: border-color 0.2s;
  border: 1px solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.text.error : theme.border.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.text.error : theme.accent.primary};
  }
`;

export const FieldErrorText = styled.span<FieldErrorTextProps>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: ${({ theme }) => theme.text.error};
  min-height: 1rem;

  i {
    font-size: 0.8rem;
  }
`;

export const FormSubmitButton = styled(Button)`
  margin-top: 1rem;
  height: 45px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;
