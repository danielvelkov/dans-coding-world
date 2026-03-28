import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Button } from '@dans-coding-world/public-blog-ui-common';

const StyledHeader = styled.header`
  display: flex;
  justify-content: space-evenly;
  align-items: center;
  margin: 1em 0em;
  padding: 1em 0em;
  gap: 1em;

  @media screen and (max-width: 660px) {
    flex-wrap: wrap;
  }

  ul {
    list-style: none;
    display: flex;
    gap: 2em;
    align-items: baseline;
  }
`;

const StyledSiteNavLink = styled(Link)`
  text-underline-offset: 5px;
  color: ${({ theme }) => theme.accent.primary};
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
  border-radius: 20px;
  color: ${({ theme }) => theme.text.primary};
`;

export function Header({
  isDarkMode,
  setIsDarkMode,
}: {
  isDarkMode: boolean;
  setIsDarkMode: (flag: boolean) => void;
}) {
  return (
    <StyledHeader>
      <StyledSiteLogo to={'/blog'}>
        <h1>Dan's coding world</h1>
      </StyledSiteLogo>
      <nav>
        <ul>
          <li>
            <StyledSiteNavLink to="/login">Login</StyledSiteNavLink>
          </li>
          <li>
            <StyledSiteNavLink to="/blog">Blog</StyledSiteNavLink>
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
