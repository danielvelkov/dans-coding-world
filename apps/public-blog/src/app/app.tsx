import styled, { ThemeProvider } from 'styled-components';

import { Route, Routes, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import Blog from '../routes/blog/Blog';
import Post from '../routes/blog/Post';
import {  useState } from 'react';
import { darkTheme, lightTheme } from '@dans-coding-world/public-blog-ui-theme';
import { GlobalStyle } from '../main';

const StyledApp = styled.div`
  padding: 0 clamp(5vmin, 5vw, 15vmax);
  margin: 0 auto;
  max-width: 1000px;
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
      <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
        <GlobalStyle></GlobalStyle>
        <StyledApp>
          <header>
            <nav>
              <ul>
                <li>
                  <Link to="/blog">Blog</Link>
                </li>
                <li>
                  <button onClick={() => setIsDarkMode(!isDarkMode)}>
                    {isDarkMode ? (
                      <i className="fas fa-sun"></i>
                    ) : (
                      <i className=" fas fa-moon"></i>
                    )}
                  </button>
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
