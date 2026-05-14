import { useAuth } from '@dans-coding-world/public-blog-shared-hooks';
import GlobalLoadingOverlay from './GlobalLoadingOverlay';
import { Outlet } from 'react-router-dom';
import { Header } from '@dans-coding-world/public-blog-features-header';
import useThemeDetector from '../styles/useThemeDetector';
import { useState } from 'react';
import { darkTheme, lightTheme } from '@dans-coding-world/public-blog-ui-theme';
import styled, { ThemeProvider } from 'styled-components';
import GlobalStyle from '../styles/global.style';

const Layout = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const StyledFooter = styled.footer`
  padding: 2em 1em;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  hr {
    width: 30ch;
    color: ${({ theme }) => theme.border.secondary};
  }
`;

function RootLayout() {
  const { isRefreshing } = useAuth();
  const userDarkMode = useThemeDetector();
  const [isDarkMode, setIsDarkMode] = useState(userDarkMode);

  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <GlobalStyle />
      {isRefreshing ? (
        <GlobalLoadingOverlay visible />
      ) : (
        <Layout>
          <Header
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          ></Header>
          <Outlet />
          <StyledFooter>
            <hr></hr>
            <span>
              made by{' '}
              <a href="https://dv-project-portfolio.netlify.app/#contact">me</a>
            </span>
            <div>
              <a href="https://github.com/danielvelkov">
                <i className="fa fa-github"></i>
              </a>
            </div>
          </StyledFooter>
        </Layout>
      )}
    </ThemeProvider>
  );
}

export default RootLayout;
