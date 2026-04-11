import { createGlobalStyle } from 'styled-components';

import BangersFont from './fonts/Bangers-Regular.ttf';

export const GlobalStyle = createGlobalStyle`
  @font-face {
      font-family: 'Bangers';
      src: url(${BangersFont});
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, sans-serif;
    background-color: ${({ theme }) => theme.background.base};
    color: ${({ theme }) => theme.text.primary};
  }
`;

export default GlobalStyle;
