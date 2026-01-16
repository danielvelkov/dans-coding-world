import styled from 'styled-components';

import { Route, Routes, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Blog from '../routes/blog/Blog';
import Post from '../routes/blog/Post';

const StyledApp = styled.div`
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
  padding: 0 clamp(5vmin, 5vw, 15vmax);
  margin: 0 auto;
  max-width: 1000px;
`;

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      <StyledApp>
        <header>
          <nav>
            <ul>
              <li>
                <Link to="/blog">Blog</Link>
              </li>
            </ul>
          </nav>
        </header>
        <Routes>
          <Route path="blog">
            <Route index element={<Blog />} />
            <Route path=":postId" element={<Post />} />
          </Route>
        </Routes>
      </StyledApp>
    </QueryClientProvider>
  );
}

export default App;
