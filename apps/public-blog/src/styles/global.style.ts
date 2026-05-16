import { createGlobalStyle } from 'styled-components';

import BangersFont from './fonts/Bangers-Regular.ttf';
import InterFont from './fonts/Inter-Variable.ttf';

export const GlobalStyle = createGlobalStyle`
  @font-face {
      font-family: 'Bangers';
      src: url(${BangersFont});
  }

  @font-face {
      font-family: 'Inter';
      src: url(${InterFont});
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background-color: ${({ theme }) => theme.background.base};
  color: ${({ theme }) => theme.text.primary};
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code, pre, kbd, samp {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
`;

export default GlobalStyle;
