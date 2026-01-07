import styled from 'styled-components';

import { BlogList } from '@dans-coding-world/public-blog-features-blog-list';
import { Route, Routes, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const StyledApp = styled.div`
  // Your style here
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
`;

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <StyledApp>
        <div role="navigation">
          <ul>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
          </ul>
        </div>
        <Routes>
          <Route
            path="/blog"
            element={
              <BlogList
                onPostClick={() => {
                  console.log('Post link clicked');
                }}
                onAuthorClick={() => {
                  console.log('Author link clicked');
                }}
              ></BlogList>
            }
          />
        </Routes>
      </StyledApp>
    </QueryClientProvider>
  );
}

export default App;
