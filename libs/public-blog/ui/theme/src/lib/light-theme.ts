import { DefaultTheme } from 'styled-components';

export const lightTheme: DefaultTheme = {
  text: {
    primary: '#1a1a2e',
    secondary: '#4a4a5a',
    muted: '#9a9aaa',
    error: '#d64545',
  },
  background: {
    base: '#f9f7f7',
    surface: '#ffffff',
    elevated: '#f0eaea',
    inverse: '#fcddddc7',
    error: 'rgba(214, 69, 69, 0.12)',
  },
  border: {
    primary: 'rgba(210, 200, 200, 0.8)',
    secondary: 'rgba(210, 200, 200, 0.35)',
    hover: '#c084848c',
  },
  accent: {
    primary: '#f8755eff',
    hover: '#d45448ff',
    soft: '#f5e6e5',
    muted: 'rgba(192, 57, 43, 0.15)',
  },
  shimmer: { base: '#e6e6e6', highlight: '#eeaa9dff' },
};
