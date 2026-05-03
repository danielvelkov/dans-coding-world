import {
  UserAvatar,
  LoadingSpinner,
} from '@dans-coding-world/public-blog-ui-common';
import { UserDetail } from '@dans-coding-world/user-data-access';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { getDisplayName } from '@dans-coding-world/public-blog-shared-helpers';

const StyledButton = styled.button<React.ComponentPropsWithoutRef<'button'>>`
  background: inherit;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.text.primary};
`;

const StyledLink = styled(StyledButton)`
  text-decoration: none;
  font-size: small;
`;

const StyledUserProfileDropdown = styled.div<
  React.ComponentPropsWithRef<'div'>
>`
  position: relative;

  > ${StyledButton} {
    display: flex;
    align-items: center;
    gap: 10px;
    .user-and-email {
      display: flex;
      flex-direction: column;

      span:first-child {
        align-self: center;
        font-weight: 600;
        font-size: 1em;
      }

      span:nth-child(2) {
        align-self: flex-start;
        color: ${({ theme }) => theme.text.muted};
        font-size: smaller;
      }
    }
  }
`;

const StyledUserAvatar = styled(UserAvatar)`
  color: ${({ theme }) => theme.text.primary};
  border: 2px solid ${({ theme }) => theme.border.primary};
  border-radius: 50%;
  padding: 3px 4px;
`;

const StyledLoadingAvatarWrapper = styled.div`
  position: relative;
`;

const StyledLoadingSpinner = styled(LoadingSpinner)`
  position: absolute;
  height: 100%;
`;

const StyledCardMenu = styled.ul<React.ComponentPropsWithoutRef<'ul'>>`
  position: absolute;
  display: flex;
  flex-direction: column;
  z-index: 3;
  left: 25%;
  top: 50px;
  border: 2px solid ${({ theme }) => theme.border.primary};
  background-color: ${({ theme }) => theme.background.elevated};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  gap: 0 !important;
  align-items: stretch !important;
  border-radius: 5px;

  ${StyledButton} {
    border-radius: 3px;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 10px 12px;
    text-transform: capitalize;
    font-weight: 550;
    font-family: inherit;
    width: 100%;
  }

  ${StyledButton}:hover {
    background-color: ${({ theme }) => theme.accent.primary};
    color: #fff;
  }

  .arrow {
    position: absolute;
    top: -20px;
    border-bottom: 8px solid ${({ theme }) => theme.border.primary};
    border-top: 8px solid transparent;

    border-right: 8px solid transparent;
    border-left: 8px solid transparent;
    width: 0;
    height: 0;
    align-self: center;
  }
`;

export function UserProfileDropdown({
  user,
  logoutAction,
  isLoading,
}: {
  user: Omit<UserDetail, 'password'>;
  logoutAction: () => void;
  isLoading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        cardMenuRef.current &&
        !cardMenuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const name = getDisplayName(user);

  return (
    <StyledUserProfileDropdown
      ref={cardMenuRef}
      data-testid={'user-profile-dropdown'}
    >
      <StyledButton
        aria-haspopup="true"
        aria-controls="expandable-menu"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((open) => !open);
        }}
      >
        <div className="user-and-email">
          <span>{name}</span>
          <span>{user.email}</span>
        </div>
        <StyledLoadingAvatarWrapper>
          {isLoading && (
            <StyledLoadingSpinner data-testid="loading-profile-spinner" />
          )}
          <StyledUserAvatar
            name={user.username}
            size="M"
            avatarURL={user.profile?.avatarURL}
            shape={'circle'}
          />
        </StyledLoadingAvatarWrapper>
      </StyledButton>

      {isOpen && (
        <StyledCardMenu
          id="expandable-menu"
          role="menu"
          onClick={() => setIsOpen(false)}
        >
          <div className="arrow"></div>

          <li role="presentation">
            <StyledLink to={`/users/${user.id}`} role="menuitem" as={Link}>
              <i className="fa fa-thin fa-id-card"></i>
              Profile
            </StyledLink>
          </li>

          <li role="presentation">
            <StyledLink to={`/users/${user.id}/edit`} role="menuitem" as={Link}>
              <i className="fa fa-pen"></i>
              {user.profile ? 'Edit profile' : 'Setup profile'}
            </StyledLink>
          </li>

          <li role="presentation">
            <StyledLink to={`/settings`} role="menuitem" as={Link}>
              <i className="fa fa-gear"></i>
              Settings
            </StyledLink>
          </li>

          <li role="presentation">
            <StyledButton onClick={() => logoutAction()} role="menuitem">
              <i className="fa fa-sign-out"></i>
              Logout
            </StyledButton>
          </li>
        </StyledCardMenu>
      )}
    </StyledUserProfileDropdown>
  );
}

export default UserProfileDropdown;
