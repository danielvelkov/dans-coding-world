import styled from 'styled-components';

import { Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Blog from '../routes/blog/Blog';
import Post from '../routes/blog/Post';
import Login from '../routes/user/Login';
import { NotFound } from '@dans-coding-world/public-blog-ui-errors';
import { ErrorBoundary } from 'react-error-boundary';
import { Fallback } from './Fallback';
import { AuthProvider } from '@dans-coding-world/public-blog-shared-hooks';
import Register from '../routes/user/Register';
import Profile from '../routes/user/Profile';
import RootLayout from './RootLayout';
import Settings from '../routes/user/Settings';

const StyledApp = styled.div`
  padding: 0 clamp(5vmin, 5vw, 15vmax);
  margin: 0 auto;
  max-width: 1320px;
  height: 100vh;
`;

// dev tools do not work during e2e testing for some reason
// also cant set node env in e2e cypress tests
const showDevTools = process.env.NODE_ENV === 'development';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {showDevTools && <ReactQueryDevtools initialIsOpen={false} />}
      <AuthProvider>
        <StyledApp>
          <Routes>
            <Route element={<RootLayout />}>
              <Route index element={<Navigate to="blog" replace />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
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
              <Route path="users">
                <Route
                  path=":userId/*"
                  element={
                    <ErrorBoundary FallbackComponent={Fallback}>
                      <Profile />
                    </ErrorBoundary>
                  }
                />
              </Route>
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </StyledApp>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
