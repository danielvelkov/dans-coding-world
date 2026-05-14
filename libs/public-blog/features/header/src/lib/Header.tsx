import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@dans-coding-world/public-blog-ui-common';
import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import UserProfileDropdown from './components/UserProfileDropdown';

const StyledHeader = styled.header`
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  margin: 1em 0em;
  padding: 1em 0em;
  gap: 5px;

  @media screen and (max-width: 660px) {
    flex-wrap: wrap;
  }

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    gap: 2em;
    align-items: center;
  }
`;

const StyledSiteNavLink = styled(Link)`
  text-underline-offset: 5px;
  color: ${({ theme }) => theme.accent.primary} !important;
`;

const StyledSiteLogo = styled(Link)`
  text-decoration: none;
  text-transform: capitalize;
  color: inherit;
  text-align: center;
  font-size: larger;
  font-family: 'Bangers';
`;

const StyledButton = styled(Button)`
  padding: 5px 8px;
  margin: 0;
  border-radius: 10px;
  color: ${({ theme }) => theme.text.primary};
`;

export function Header({
  isDarkMode,
  setIsDarkMode,
}: {
  isDarkMode: boolean;
  setIsDarkMode: (flag: boolean) => void;
}) {
  const { isAuthenticated, logout, isLoading, user, isLoadingProfile } =
    useAuth();

  return (
    <StyledHeader>
      <StyledSiteLogo to={'/blog'}>
        <h1>Dan's coding world</h1>
      </StyledSiteLogo>
      <nav>
        <ul>
          <li>
            <StyledSiteNavLink to="/blog">Blog</StyledSiteNavLink>
          </li>
          <li>
            {isAuthenticated && user ? (
              <UserProfileDropdown
                user={user}
                logoutAction={logout}
                isLoading={isLoading || isLoadingProfile}
              ></UserProfileDropdown>
            ) : (
              <StyledSiteNavLink to="/login">Login</StyledSiteNavLink>
            )}
          </li>
          <li>
            <StyledButton
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={`Change to ${!isDarkMode ? 'dark' : 'light'} mode`}
            >
              {isDarkMode ? (
                <i className="fas fa-sun"></i>
              ) : (
                <i className=" fas fa-moon"></i>
              )}
            </StyledButton>
          </li>
        </ul>
      </nav>
    </StyledHeader>
  );
}

export default Header;
