import styled, { ThemeProvider } from 'styled-components';

import { Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Blog from '../routes/blog/Blog';
import Post from '../routes/blog/Post';
import Login from '../routes/user/Login';
import { useState } from 'react';
import { darkTheme, lightTheme } from '@dans-coding-world/public-blog-ui-theme';
import { NotFound } from '@dans-coding-world/public-blog-ui-errors';
import { GlobalStyle } from '../styles/global.style.js';
import { ErrorBoundary } from 'react-error-boundary';
import { Fallback } from './Fallback';
import { AuthProvider } from '@dans-coding-world/public-blog-shared-hooks';
import { Header } from '@dans-coding-world/public-blog-features-header';
import Register from '../routes/user/Register';

const StyledApp = styled.div`
  padding: 0 clamp(5vmin, 5vw, 15vmax);
  margin: 0 auto;
  max-width: 1320px;
`;

// dev tools do not work during e2e testing for some reason
// also cant set node env in e2e cypress tests
const showDevTools =
  process.env.NODE_ENV !== 'development' &&
  process.env.NODE_ENV !== 'production';

const queryClient = new QueryClient();

export function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      {showDevTools && <ReactQueryDevtools initialIsOpen={false} />}
      <AuthProvider>
        <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
          <GlobalStyle />
          <StyledApp>
            <Header
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
            ></Header>
            <Routes>
              <Route path="login">
                <Route index element={<Login />} />
              </Route>
              <Route path="register">
                <Route index element={<Register />} />
              </Route>
              <Route path="blog">
                <Route index element={<Blog />} />
                <Route
                  path=":postId"
                  element={
                    <ErrorBoundary FallbackComponent={Fallback}>
                      <Post />
                    </ErrorBoundary>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </StyledApp>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
