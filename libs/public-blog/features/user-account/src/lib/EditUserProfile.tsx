import {
  useAuth,
  useUpdateProfile,
} from '@dans-coding-world/public-blog-shared-hooks';
import { UpdateUserDto } from '@dans-coding-world/shared-user-dto';
import { useEffect, useRef, useState } from 'react';
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
} from '@dans-coding-world/shared-constants';
import {
  Button,
  LoadingSpinner,
  UserAvatar,
} from '@dans-coding-world/public-blog-ui-common';
import styled from 'styled-components';

type ErrorMap<T> = Partial<Record<keyof T, string>>;
type UpdateProfileErrors = ErrorMap<UpdateUserDto>;

const StyledFormContainer = styled(FormContainer)`
  h1 {
    margin: 0;
  }

  .info {
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text.secondary};
    margin: 0;
    font-style: italic;
  }

  label:has(+ :optional)::after {
    content: ' *';
    color: ${({ theme }) => theme.text.secondary};
  }
`;

const StyledAvatarContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
`;

const StyledAvatarFormField = styled(FormField)`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1em;
  padding-bottom: 1em;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
  flex-wrap: wrap;

  & > * {
    flex: 0;
  }

  ${FieldErrorText} {
    flex: 0 0 100%;
  }
`;

const StyledUpdateAvatarActions = styled.div`
  display: flex;
  gap: 0.8em;
  flex-wrap: wrap;
  flex-grow: 1;

  h4 {
    flex: 1 0 100%;
    margin: 0;
  }
`;

const StyledUserAvatar = styled(UserAvatar)`
  border: 3px solid ${({ theme }) => theme.border.primary};
  border-radius: 50%;
`;

const StyledUploadButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0.5em 1em;
  font-size: small;
  background-color: blueviolet;
  color: white;
`;

const StyledRemoveButton = styled(StyledUploadButton)`
  color: ${({ theme }) => theme.text.primary};
  background-color: ${({ theme }) => theme.background.elevated};
`;

const StyledRevertButton = styled(FormSubmitButton)`
  background-color: ${({ theme }) => theme.accent.soft};
  color: ${({ theme }) => theme.text.secondary};
  margin-bottom: -1em;
`;

const StyledFieldWarningText = styled(FieldErrorText)`
  color: ${({ theme }) => theme.text.warning};
`;

const StyledFormTextarea = styled(FormInput.withComponent('textarea'))`
  outline: 1px solid ${({ theme }) => theme.border.primary};
  border-radius: 5px;
  padding: 0.5em 1em;
  color: ${({ theme }) => theme.text.primary};
  font-family: inherit;
  resize: none;
  background-color: inherit;
`;

export function EditUserProfile({ userId }: { userId: number }) {
  const { isAuthenticated, user: loggedInUser } = useAuth();
  const {
    error: apiError,
    updateProfile,
    isSubmitting,
    isSuccess,
    reset,
  } = useUpdateProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // avatar can be in 3 states:
  // 1. undefined - user has not set new profile pic
  // 2. null - user has explicitly clicked "Remove profile pic"
  // 3. File - user has selected an Avatar image for update
  const [avatar, setAvatar] = useState<File | null | undefined>(undefined);
  const [formData, setFormData] = useState<
    Pick<UpdateUserDto, 'firstName' | 'lastName' | 'bio'>
  >({
    firstName: undefined,
    lastName: undefined,
    bio: undefined,
  });

  const [errors, setErrors] = useState<UpdateProfileErrors>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthenticated || (isAuthenticated && loggedInUser?.id !== userId)) {
      navigate('/login', {
        state: {
          redirectTo: location.pathname,
        },
      });
    } else if (loggedInUser?.profile)
      setFormData({
        firstName: loggedInUser.profile.firstName,
        lastName: loggedInUser.profile.lastName,
        bio: loggedInUser.profile.bio,
      });
  }, [isAuthenticated, navigate, location.pathname, loggedInUser, userId]);

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (isSuccess && isAuthenticated) navigate(`/users/${userId}`);
  }, [isSuccess, isAuthenticated, navigate, userId]);

  useEffect(() => {
    const apiErrors = getApiFieldErrors(apiError, [
      'firstName',
      'lastName',
      'bio',
      'avatar',
    ]);
    if (Object.keys(apiErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...apiErrors }));
    }
  }, [apiError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name, errors, setErrors);
  };

  const handleInvalidInput =
    createFieldInvalidHandler<HTMLInputElement>(setErrors);
  const handleInvalidTextarea =
    createFieldInvalidHandler<HTMLTextAreaElement>(setErrors);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(errors).length === 0) {
      const updateDto: Omit<Parameters<typeof updateProfile>[0], 'avatarURL'> =
        {
          userId,
          ...formData,
        };
      if (avatar) updateDto.avatar = avatar;
      else if (avatar === null) updateDto.removeAvatar = true;
      updateProfile(updateDto);
    }
  };

  return (
    <StyledFormContainer onSubmit={handleSubmit}>
      <h1>{loggedInUser?.profile ? 'Edit Account' : 'Setup Your Account'}</h1>
      <StyledAvatarFormField>
        <StyledAvatarContainer>
          <StyledUserAvatar
            {...(avatar !== null && {
              avatarURL: avatar
                ? URL.createObjectURL(avatar)
                : loggedInUser?.profile?.avatarURL,
            })}
            size="XL"
            name={loggedInUser?.username ?? userId.toString()}
            shape="circle"
          />
        </StyledAvatarContainer>

        <StyledUpdateAvatarActions>
          <h4>Profile Picture</h4>
          <div style={{ display: 'flex', gap: '5px' }}>
            <StyledUploadButton
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa fa-upload"></i>Upload
            </StyledUploadButton>
            <StyledRemoveButton onClick={() => setAvatar(null)} type="button">
              Remove
            </StyledRemoveButton>
          </div>
          <p className="info">
            The supported image formats are{' '}
            {USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS.map(
              (ext) => ext.toUpperCase().substring(1) + 's'
            ).join(' ') +
              ` under ${
                USER_CONSTRAINTS.MAX_SIZE_AVATAR_IMAGE / 1024 / 1024
              }mb`}
          </p>
        </StyledUpdateAvatarActions>
        {errors.avatar && (
          <FieldErrorText data-testid="avatar-error">
            <i className="fa fa-exclamation-triangle" /> {errors.avatar}
          </FieldErrorText>
        )}
      </StyledAvatarFormField>

      <FormField>
        <label htmlFor="first-name">First Name</label>
        <FormInput
          id="first-name"
          name="firstName"
          placeholder="John"
          minLength={USER_CONSTRAINTS.MIN_FIRST_NAME_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_FIRST_NAME_LENGTH}
          value={formData.firstName ?? ''}
          onChange={handleChange}
          $hasError={!!errors.firstName}
          onInvalid={handleInvalidInput}
        />
        {loggedInUser?.profile &&
          loggedInUser.profile.firstName &&
          formData.firstName === '' && (
            <StyledFieldWarningText data-testid="first-name-warning">
              <i className="fa fa-exclamation-triangle" />{' '}
              <span>Field will be cleared</span>
            </StyledFieldWarningText>
          )}
        {errors.firstName && (
          <FieldErrorText data-testid="first-name-error">
            <i className="fa fa-exclamation-triangle" /> {errors.firstName}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="last-name">Last Name</label>
        <FormInput
          id="last-name"
          name="lastName"
          placeholder="Doe"
          minLength={USER_CONSTRAINTS.MIN_LAST_NAME_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_LAST_NAME_LENGTH}
          value={formData.lastName ?? ''}
          onChange={handleChange}
          $hasError={!!errors.lastName}
          onInvalid={handleInvalidInput}
        />
        {loggedInUser?.profile &&
          loggedInUser.profile.lastName &&
          formData.lastName === '' && (
            <StyledFieldWarningText data-testid="last-name-warning">
              <i className="fa fa-exclamation-triangle" />{' '}
              <span>Field will be cleared</span>
            </StyledFieldWarningText>
          )}
        {errors.lastName && (
          <FieldErrorText data-testid="last-name-error">
            <i className="fa fa-exclamation-triangle" /> {errors.lastName}
          </FieldErrorText>
        )}
      </FormField>

      <FormField>
        <label htmlFor="bio">Bio</label>
        <StyledFormTextarea
          id="bio"
          name="bio"
          rows={4}
          value={formData.bio ?? ''}
          minLength={USER_CONSTRAINTS.MIN_BIO_LENGTH}
          maxLength={USER_CONSTRAINTS.MAX_BIO_LENGTH}
          onChange={handleChange}
          $hasError={!!errors.bio}
          onInvalid={handleInvalidTextarea}
        />
        {loggedInUser?.profile &&
          loggedInUser.profile.bio &&
          formData.bio === '' && (
            <StyledFieldWarningText data-testid="bio-warning">
              <i className="fa fa-exclamation-triangle" />{' '}
              <span>Field will be cleared</span>
            </StyledFieldWarningText>
          )}
        {errors.bio && (
          <FieldErrorText data-testid="bio-error">
            <i className="fa fa-exclamation-triangle" /> {errors.bio}
          </FieldErrorText>
        )}
      </FormField>
      <p className="info">* All fields are optional.</p>

      {apiError &&
        !Object.values(errors).some((error) => !!error) &&
        apiError.message !==
          ERROR_MESSAGES[ERROR_CODES.VALIDATION.VALIDATION_ERROR] && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-testid="update-profile-error"
          >
            <FieldErrorText>
              {apiError.message ?? 'Unable to save changes. Please try again.'}
            </FieldErrorText>
          </div>
        )}

      <input
        data-testid="file-input"
        ref={fileInputRef}
        accept={USER_CONSTRAINTS.AVATAR_IMAGE_ALLOWED_EXTENSIONS.map(
          (ext) => `image/${ext.substring(1)}, ${ext}`
        ).join(', ')}
        type="file"
        hidden
        onChange={(e) => setAvatar(e.target.files?.[0])}
      ></input>

      <StyledRevertButton
        type="reset"
        onClick={() => {
          if (loggedInUser?.profile)
            setFormData({
              firstName: loggedInUser.profile.firstName,
              lastName: loggedInUser.profile.lastName,
              bio: loggedInUser.profile.bio,
            });
          else
            setFormData({
              firstName: undefined,
              lastName: undefined,
              bio: undefined,
            });
          setAvatar(undefined);
        }}
      >
        Revert changes
      </StyledRevertButton>
      <FormSubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? <LoadingSpinner /> : 'Save'}
      </FormSubmitButton>
    </StyledFormContainer>
  );
}

export default EditUserProfile;
