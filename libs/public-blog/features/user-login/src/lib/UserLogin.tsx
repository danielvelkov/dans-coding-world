import styled from 'styled-components';
import { LoadingSpinner } from '@dans-coding-world/public-blog-ui-common';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  clearFieldError,
  createFieldInvalidHandler,
  FieldErrorText,
  FormContainer,
  FormField,
  FormInput,
  FormSubmitButton,
  getApiFieldErrors,
} from '@dans-coding-world/public-blog-ui-form';
import { LoginDto } from '@dans-coding-world/shared-auth-dto';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
} from '@dans-coding-world/shared-constants';

type ErrorMap<T> = Partial<Record<keyof T, string>>;
type LoginErrors = ErrorMap<LoginDto>;

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.accent.primary};
`;

const StyledUserLoginForm = styled(FormContainer)`
  width: fit-content;
  padding: 2em 10%;
  align-items: center;
  h1 {
    text-align: center;
  }

  .call-to-action {
    font-size: 0.9em;
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 1em;
  }
`;

export function UserLogin() {
  const { login, isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<LoginErrors>({});
  const handleInvalid = createFieldInvalidHandler(setErrors);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.redirectTo ?? '/blog';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  useEffect(() => {
    const apiErrors = getApiFieldErrors(error, ['email', 'password']);
    if (Object.keys(apiErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...apiErrors }));
    }
  }, [error]);

  const emailError = errors.email;
  const passwordError = errors.password;

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (formData.email && formData.password) {
      login({ email: formData.email, password: formData.password });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, errors, setErrors);
  };

  return (
    <StyledUserLoginForm onSubmit={handleFormSubmit}>
      <div>
        <h1>Login</h1>
        <span className="call-to-action">Log in to join the conversation</span>
      </div>

      <FormField>
        <label htmlFor="email">Email</label>
        <FormInput
          required
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          $hasError={!!emailError}
          placeholder="john.doe@mail.com"
          onInvalid={handleInvalid}
        />
        {emailError && (
          <FieldErrorText>
            <i className="fa fa-exclamation-triangle"></i> {emailError}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="pwd">Password</label>
        <FormInput
          required
          id="pwd"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          $hasError={!!passwordError}
          onInvalid={handleInvalid}
        />
        {passwordError && (
          <FieldErrorText>
            <i className="fa fa-exclamation-triangle"></i> {passwordError}
          </FieldErrorText>
        )}
      </FormField>

      {error &&
        !emailError &&
        !passwordError &&
        error.message !==
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR] && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-testid="login-error"
          >
            <FieldErrorText>
              {error.message ?? 'Unable to login. Please try again.'}
            </FieldErrorText>
          </div>
        )}

      <FormSubmitButton type="submit">
        {isLoading ? (
          <>
            <span style={{ position: 'absolute', left: '-9999px' }}>
              Logging in…
            </span>
            <LoadingSpinner />
          </>
        ) : (
          'Login'
        )}
      </FormSubmitButton>

      <span className="call-to-action">
        Not a member? <StyledLink to={'/register'}>Register</StyledLink>
      </span>
    </StyledUserLoginForm>
  );
}

export default UserLogin;
