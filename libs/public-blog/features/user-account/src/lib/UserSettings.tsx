import {
  useAuth,
  useChangePassword,
  useDeleteAccount,
} from '@dans-coding-world/public-blog-shared-hooks';
import { ChangePasswordDto } from '@dans-coding-world/shared-user-dto';
import React, { useEffect, useState } from 'react';
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
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ERROR_CODES,
  ERROR_MESSAGES,
  USER_CONSTRAINTS,
  VALIDATION_MESSAGES,
} from '@dans-coding-world/shared-constants';
import {
  Button,
  LoadingSpinner,
  Modal,
} from '@dans-coding-world/public-blog-ui-common';
import styled from 'styled-components';
import { ShimmerProfile } from './components/ShimmerProfile';

type ErrorMap<T> = Partial<Record<keyof T, string>>;
type UpdatePasswordErrors = ErrorMap<
  Pick<ChangePasswordDto, 'oldPassword' | 'newPassword'> & {
    confirmPassword?: string;
  }
>;

const StyledFormContainer = styled(FormContainer)`
  h1 {
    margin: 1px 0;
  }
  h2 {
    margin-bottom: 5px;
  }

  .info {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text.secondary};
    margin: 0;
    font-style: italic;
  }

  hr {
    width: 100%;
    color: ${({ theme }) => theme.border.secondary};
  }
`;

const DeleteAccountContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1em;
  h2 {
    margin-bottom: 0;
  }
  i {
    color: ${({ theme }) => theme.text.error};
  }
  p {
    color: ${({ theme }) => theme.text.secondary};
  }
`;

const StyledRemoveButton = styled(Button)`
  color: ${({ theme }) => theme.text.primary};
  background-color: ${({ theme }) => theme.background.error};
`;

const StyledModalContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2em;

  .actions {
    margin-top: -1em;
    display: flex;
    gap: 1em;
  }
`;

const FormSuccessMessage = styled.p`
  border-radius: 5px;
  padding: 1em;
  margin: 0;
  color: ${({ theme }) => theme.text.success};
  background-color: ${({ theme }) => theme.background.success};
  border: 1px solid darkgreen;
`;

export function UserSettings() {
  const [openDialog, setOpenDialog] = useState(false);
  const { isAuthenticated, user, isLoading, logout } = useAuth();
  const {
    error: apiError,
    changePassword,
    isSubmitting: changingPassword,
    isSuccess: passwordChanged,
    reset,
  } = useChangePassword();
  const {
    deleteAccount,
    isSubmitting: deletingAccount,
    isSuccess: accountDeleted,
  } = useDeleteAccount();

  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState<
    Pick<ChangePasswordDto, 'oldPassword' | 'newPassword'> & {
      confirmPassword?: string;
    }
  >({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<UpdatePasswordErrors>({});

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate('/login', {
        state: {
          redirectTo: location.pathname,
        },
      });
    }
  }, [isLoading, isAuthenticated, navigate, location.pathname]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    const apiErrors = getApiFieldErrors(apiError, [
      'oldPassword',
      'newPassword',
    ]);
    if (Object.keys(apiErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...apiErrors }));
    }
  }, [apiError]);

  useEffect(() => {
    if (accountDeleted) {
      logout();
      navigate('/blog');
    }
  }, [accountDeleted, logout, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, errors, setErrors);
    reset();
  };

  const handleInvalidInput =
    createFieldInvalidHandler<HTMLInputElement>(setErrors);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.values(errors).some((err) => err.length > 0) && validate()) {
      const changePassDto: Parameters<typeof changePassword>[0] = {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
      };
      changePassword(changePassDto);
    }
  };

  if (isLoading || !user) return <ShimmerProfile />;

  return (
    <StyledFormContainer onSubmit={handleSubmit}>
      <h1>Settings</h1>
      <h2>{'Change password'}</h2>
      <FormField>
        <label htmlFor="old-password">Old Password</label>
        <FormInput
          id="old-password"
          name="oldPassword"
          type="password"
          required
          placeholder="••••••••"
          title={`Your old user password`}
          value={formData.oldPassword}
          minLength={USER_CONSTRAINTS.MIN_PASSWORD_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_PASSWORD_LENGTH}
          onChange={handleChange}
          onInvalid={(event: React.InvalidEvent<HTMLInputElement>) => {
            handleInvalidInput(event, (val) =>
              event.target.validity.patternMismatch
                ? VALIDATION_MESSAGES.password.weak
                : val
            );
          }}
          $hasError={!!errors.oldPassword}
        />
        {errors.oldPassword && (
          <FieldErrorText data-testid="old-password-error">
            <i className="fa fa-exclamation-triangle" /> {errors.oldPassword}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="new-password">New Password</label>
        <FormInput
          id="new-password"
          name="newPassword"
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
          value={formData.newPassword}
          minLength={USER_CONSTRAINTS.MIN_PASSWORD_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_PASSWORD_LENGTH}
          pattern={
            new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
              .source
          }
          onChange={handleChange}
          onInvalid={(event: React.InvalidEvent<HTMLInputElement>) => {
            handleInvalidInput(event, (val) =>
              event.target.validity.patternMismatch
                ? VALIDATION_MESSAGES.password.weak
                : val
            );
          }}
          $hasError={!!errors.newPassword}
        />
        {errors.newPassword && (
          <FieldErrorText data-testid="new-password-error">
            <i className="fa fa-exclamation-triangle" /> {errors.newPassword}
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
          onInvalid={handleInvalidInput}
        />
        {errors.confirmPassword && (
          <FieldErrorText data-testid="confirm-password-error">
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
            data-testid="change-password-error"
          >
            <FieldErrorText>
              {(apiError.message &&
              apiError.message ===
                ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_CREDENTIALS]
                ? 'Old password verification failed.'
                : apiError.message) ??
                'Failed to change password. Please try again.'}
            </FieldErrorText>
          </div>
        )}

      {passwordChanged && (
        <FormSuccessMessage>
          <i className="fa fa-check" /> {errors.newPassword}
          Password changed successfully
        </FormSuccessMessage>
      )}

      <FormSubmitButton type="submit" disabled={changingPassword}>
        {changingPassword ? (
          <div role="status" aria-live="polite" aria-label="Loading">
            <LoadingSpinner />
          </div>
        ) : (
          'Change'
        )}
      </FormSubmitButton>

      <hr></hr>

      {user.role !== 'ADMIN' && (
        <DeleteAccountContainer>
          <h2>
            Delete account <i className="fa fa-warning"></i>
          </h2>
          <p>
            Deleting your account removes all the posts, comments and reports
            you've made.
            <br />
            <br />
            <em>Action is irreversible!</em>
          </p>
          <StyledRemoveButton type="button" onClick={() => setOpenDialog(true)}>
            Delete Account
          </StyledRemoveButton>

          {openDialog && (
            <Modal
              open
              modalTitle="Account deletion"
              onClose={() => setOpenDialog(false)}
            >
              <StyledModalContent>
                <p>Are you sure you want to delete your account?</p>
                <div className="actions">
                  <Button
                    type="button"
                    onClick={() => {
                      deleteAccount(user.id);
                    }}
                    aria-label="Delete account"
                  >
                    {!deletingAccount ? 'Yes' : 'Deleting...'}
                  </Button>
                  <Button type="button" onClick={() => setOpenDialog(false)}>
                    No
                  </Button>
                </div>
              </StyledModalContent>
            </Modal>
          )}
        </DeleteAccountContainer>
      )}
    </StyledFormContainer>
  );
}

export default UserSettings;
