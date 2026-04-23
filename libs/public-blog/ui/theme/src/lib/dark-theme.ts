import { DefaultTheme } from 'styled-components';

export const darkTheme: DefaultTheme = {
  text: {
    primary: '#f0eaea',
    secondary: '#b0a8a8',
    muted: '#6b6370',
    error: '#ff6b6b',
    warning: '#e0e077ff',
  },
  background: {
    base: '#0f0f14',
    surface: '#1a1820',
    elevated: '#242030',
    inverse: '#504a63b9',
    error: 'rgba(224, 82, 82, 0.12)',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.04)',
    hover: 'rgba(192, 57, 43, 0.4)',
  },
  accent: {
    primary: '#f85b5b6b',
    hover: '#d15f5fdc',
    soft: 'rgba(248, 70, 70, 0.26)',
    muted: 'rgba(224, 82, 82, 0.08)',
  },
  shimmer: { base: '#312d50', highlight: '#645c7c' },
};
