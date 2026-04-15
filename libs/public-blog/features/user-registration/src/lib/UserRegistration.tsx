import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@dans-coding-world/public-blog-ui-common';
import {
  useAuth,
  useRegister,
} from '@dans-coding-world/public-blog-shared-hooks';
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
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import { RegisterDto } from '@dans-coding-world/shared-auth-dto';

type ErrorMap<T> = Partial<Record<keyof T, string>>;
type RegistrationErrors = ErrorMap<RegisterDto> & { confirmPassword?: string };

const StyledLink = styled(Link)`
  color: ${({ theme }) => theme.accent.primary};
  text-decoration: none;
  font-weight: bold;
  &:hover {
    text-decoration: underline;
  }
`;

const StyledUserRegistrationForm = styled(FormContainer)`
  h1 {
    margin: 0;
    text-align: center;
  }

  .subtitle {
    text-align: center;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 1rem;
  }
`;

const StyledFooterText = styled.p`
  font-size: 0.9rem;
  text-align: center;
  color: ${({ theme }) => theme.text.secondary};
`;

export function UserRegistration() {
  const { isAuthenticated } = useAuth();
  const { error: apiError, register, isSubmitting } = useRegister();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<RegistrationErrors>({});

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.redirectTo ?? '/blog';
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  useEffect(() => {
    const apiErrors = getApiFieldErrors(apiError, [
      'email',
      'username',
      'password',
    ]);
    if (Object.keys(apiErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...apiErrors }));
    }
  }, [apiError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, errors, setErrors);
  };

  const handleInvalid = createFieldInvalidHandler(setErrors);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });
    }
  };

  return (
    <StyledUserRegistrationForm onSubmit={handleSubmit}>
      <div>
        <h1>Sign up</h1>
        <p className="subtitle">
          Become a member to comment and see exclusive posts
        </p>
      </div>

      <FormField>
        <label htmlFor="email">Email Address</label>
        <FormInput
          id="email"
          name="email"
          type="email"
          required
          placeholder="john.doe@mail.com"
          value={formData.email}
          onChange={handleChange}
          $hasError={!!errors.email}
          onInvalid={handleInvalid}
        />
        {errors.email && (
          <FieldErrorText>
            <i className="fa fa-exclamation-triangle" /> {errors.email}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="username">Username</label>
        <FormInput
          id="username"
          name="username"
          required
          minLength={USER_CONSTRAINTS.MIN_USERNAME_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_USERNAME_LENGTH}
          pattern={USER_CONSTRAINTS.USERNAME_PATTERN.source}
          placeholder="john1eDo3"
          title={`
            Username must contain only letters and numbers,
             also be between (${USER_CONSTRAINTS.MIN_USERNAME_LENGTH}-${USER_CONSTRAINTS.MAX_USERNAME_LENGTH}) characters long.`.trim()}
          value={formData.username}
          onChange={handleChange}
          $hasError={!!errors.username}
          onInvalid={(event: React.InvalidEvent<HTMLInputElement>) => {
            handleInvalid(event, (val) =>
              event.target.validity.patternMismatch
                ? VALIDATION_MESSAGES.username.invalid
                : val
            );
          }}
        />
        {errors.username && (
          <FieldErrorText>
            <i className="fa fa-exclamation-triangle" /> {errors.username}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="password">Password</label>
        <FormInput
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          title={`
            Password must contain at least
            ${USER_CONSTRAINTS.MIN_PASSWORD_UPPERCASE} uppercase letters,
            ${USER_CONSTRAINTS.MIN_PASSWORD_NUMBER} numbers,
            ${USER_CONSTRAINTS.MIN_PASSWORD_SYMBOL} symbols,
            and be between ${USER_CONSTRAINTS.MIN_PASSWORD_LENGTH}–${USER_CONSTRAINTS.MAX_PASSWORD_LENGTH}
            characters long
          `.trim()}
          value={formData.password}
          minLength={USER_CONSTRAINTS.MIN_PASSWORD_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_PASSWORD_LENGTH}
          pattern={
            new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
              .source
          }
          onChange={handleChange}
          onInvalid={(event: React.InvalidEvent<HTMLInputElement>) => {
            handleInvalid(event, (val) =>
              event.target.validity.patternMismatch
                ? VALIDATION_MESSAGES.password.weak
                : val
            );
          }}
          $hasError={!!errors.password}
        />
        {errors.password && (
          <FieldErrorText>
            <i className="fa fa-exclamation-triangle" /> {errors.password}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="confirmPassword">Confirm Password</label>
        <FormInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          $hasError={!!errors.confirmPassword}
          onInvalid={handleInvalid}
        />
        {errors.confirmPassword && (
          <FieldErrorText>
            <i className="fa fa-exclamation-triangle" />{' '}
            {errors.confirmPassword}
          </FieldErrorText>
        )}
      </FormField>

      {apiError &&
        !Object.values(errors).some((error) => !!error) &&
        apiError.message !==
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR] && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-testid="registration-error"
          >
            <FieldErrorText>
              {apiError.message ?? 'Unable to register. Please try again.'}
            </FieldErrorText>
          </div>
        )}

      <FormSubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoadingSpinner /> : 'Create Account'}
      </FormSubmitButton>

      <StyledFooterText>
        Already a member? <StyledLink to="/login">Login</StyledLink>
      </StyledFooterText>
    </StyledUserRegistrationForm>
  );
}

export default UserRegistration;
