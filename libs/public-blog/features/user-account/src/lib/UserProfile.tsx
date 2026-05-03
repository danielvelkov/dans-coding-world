import {
  useAuth,
  useFetchUser,
} from '@dans-coding-world/public-blog-shared-hooks';
import {
  Button,
  UserAvatar,
  UserRoleBadge,
} from '@dans-coding-world/public-blog-ui-common';
import { ShimmerProfile } from './components/ShimmerProfile';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import React from 'react';

const StyledUserProfile = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const StyledHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  align-self: center;
`;

const StyledIdentity = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
`;

const StyledUserAvatar = styled(UserAvatar)`
  border: 4px solid ${({ theme }) => theme.border.primary};
  border-radius: 50%;
`;

const StyledUsername = styled.h2`
  margin: 0;
`;

const StyledButton = styled(Button)`
  border: 2px solid ${({ theme }) => theme.border.secondary};
  color: ${({ theme }) => theme.text.primary};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
`;

const StyledSettingsButton = styled(StyledButton)`
  padding: 0.5em 1em;
`;

const StyledEditButton = styled(StyledSettingsButton)`
  background-color: ${({ theme }) => theme.accent.soft};
  padding: 0.5em 1.9em;
`;

const StyledInfoList = styled.dl<React.ComponentPropsWithoutRef<'dl'>>`
  display: grid;
  gap: 0.75rem;
  margin: 0;
  padding-bottom: 1.5em;
  border-bottom: 1px solid ${({ theme }) => theme.border.primary};
`;

const StyledInfoRow = styled.div`
  display: grid;
  grid-template-columns: 140px 1fr;
  align-items: baseline;
  gap: 0.5rem;
`;

const StyledInfoLabel = styled.dt`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  color: ${({ theme }) => theme.text.secondary};
`;

const StyledInfoValue = styled.dd`
  margin: 0;
  font-size: 0.95em;
`;

const StyledSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const StyledLogoutCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  h3 {
    margin: 0;
    font-size: 0.95rem;
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${({ theme }) => theme.text.muted};
  }
`;

export function UserProfile({ userId }: { userId: number }) {
  const { data, error, isError, isPending } = useFetchUser(userId);
  const { isAuthenticated, user: loggedInUser, logout } = useAuth();

  if (isError) throw error;
  if (isPending || !data) return <ShimmerProfile />;

  const { user } = data;
  const isSameUser = isAuthenticated && loggedInUser?.id === user.id;

  return (
    <StyledUserProfile>
      <StyledHeader>
        <StyledIdentity>
          <StyledUserAvatar
            avatarURL={user.profile?.avatarURL}
            size="XL"
            name={user.username}
            shape="circle"
          />
          <StyledUsername>{user.username}</StyledUsername>
          <UserRoleBadge role={user.role} />
        </StyledIdentity>
      </StyledHeader>

      <StyledInfoList data-testid="user-info">
        {isSameUser && (
          <StyledInfoRow>
            <StyledInfoLabel>Email</StyledInfoLabel>
            <StyledInfoValue>{user.email ?? '-'}</StyledInfoValue>
          </StyledInfoRow>
        )}
        <StyledInfoRow>
          <StyledInfoLabel>First Name</StyledInfoLabel>
          <StyledInfoValue>
            {displayOrDash(user.profile?.firstName)}
          </StyledInfoValue>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>Last Name</StyledInfoLabel>
          <StyledInfoValue>
            {displayOrDash(user.profile?.lastName)}
          </StyledInfoValue>
        </StyledInfoRow>
        <StyledInfoRow>
          <StyledInfoLabel>Bio</StyledInfoLabel>
          <StyledInfoValue>{displayOrDash(user.profile?.bio)}</StyledInfoValue>
        </StyledInfoRow>
      </StyledInfoList>

      {isSameUser && (
        <>
          <StyledSection>
            <StyledLogoutCopy>
              <h3>Edit profile</h3>
              <p>Change your user info details</p>
            </StyledLogoutCopy>
            <StyledEditButton
              role="button"
              to={`/users/${userId}/edit`}
              as={Link}
            >
              <i className="fa fa-pen" />
              Edit
            </StyledEditButton>
          </StyledSection>

          <StyledSection>
            <StyledLogoutCopy>
              <h3>Settings</h3>
              <p>Everything related to your account</p>
            </StyledLogoutCopy>
            <StyledSettingsButton role="button" to={`/settings`} as={Link}>
              <i className="fa fa-gear" />
              Settings
            </StyledSettingsButton>
          </StyledSection>

          <StyledSection>
            <StyledLogoutCopy>
              <h3>Logout from profile</h3>
              <p>Logout to end your session</p>
            </StyledLogoutCopy>
            <StyledButton onClick={() => logout()}>Logout</StyledButton>
          </StyledSection>
        </>
      )}
    </StyledUserProfile>
  );
}

export const displayOrDash = (value?: string | undefined) =>
  value && value.trim().length > 0 ? value : '-';

export default UserProfile;
