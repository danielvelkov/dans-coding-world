import styled from 'styled-components';
import {
  Button,
  Input,
  LoadingSpinner,
} from '@dans-coding-world/public-blog-ui-common';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLoginValidationErrors } from './helper/login-validation';

const StyledButton = styled(Button)`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.accent.primary};
`;

const StyledInput = styled(Input)<
  React.ComponentPropsWithoutRef<typeof Input> & {
    $isValid: boolean;
  }
>`
  background-color: ${({ theme, $isValid }) =>
    $isValid ? theme.background.elevated : theme.background.error};
  border: 1px solid
    ${({ theme, $isValid }) =>
      $isValid ? theme.border.primary : theme.text.error};
`;

const StyledError = styled.span`
  &:has(i) {
    margin-left: 2em;
    position: relative;
  }
  display: inline;
  color: ${({ theme }) => theme.text.error};
  max-width: fit-content;
  white-space: pre-line;

  i {
    position: absolute;
    left: -1.5em;
    top: 20%;
  }
`;

const StyledUserLoginForm = styled.form<React.ComponentPropsWithoutRef<'form'>>`
  display: flex;
  flex-direction: column;
  gap: 1em;
  background-color: ${({ theme }) => theme.background.surface};
  border: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 5px;
  padding: 2em 15%;
  margin: 0 auto;
  max-width: 60ch;

  .call-to-action {
    font-size: 0.9em;
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 1em;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 0.5em;
  }

  label {
    font-weight: bold;
  }
`;

export function UserLogin() {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate(-1);
  }, [isAuthenticated, navigate]);

  // TODO: remove
  // const [email, setEmail] = useState('admin123@gmail.com'); // For quicker testing
  // const [password, setPassword] = useState('Admin123@');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailError, passwordError] = getLoginValidationErrors(error);

  const handleFormSubmit = () => {
    if (email && password) login({ email, password });
  };

  return (
    <StyledUserLoginForm
      onSubmit={(event) => {
        event.preventDefault();
        handleFormSubmit();
      }}
    >
      <h1>Login</h1>
      <span className="call-to-action">Log in to join the conversation</span>
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <StyledInput
          required
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail((e.target as any).value)}
          $isValid={!emailError}
          placeholder="john.doe@mail.com"
        ></StyledInput>
        {emailError && (
          <StyledError>
            <i className="fa fa-exclamation-triangle"></i> {emailError}
          </StyledError>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="pwd">Password</label>
        <StyledInput
          required
          id="pwd"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword((e.target as any).value)}
          $isValid={!passwordError}
        ></StyledInput>
        {passwordError && (
          <StyledError>
            <i className="fa fa-exclamation-triangle"></i> {passwordError}
          </StyledError>
        )}
      </div>

      {error && !emailError && !passwordError && (
        <StyledError>{error.message}</StyledError>
      )}

      <StyledButton type="submit">
        {isLoading ? <LoadingSpinner /> : 'Login'}
      </StyledButton>
      <span className="call-to-action">
        Not a member? <StyledLink to={'/register'}>Register</StyledLink>
      </span>
    </StyledUserLoginForm>
  );
}

export default UserLogin;
