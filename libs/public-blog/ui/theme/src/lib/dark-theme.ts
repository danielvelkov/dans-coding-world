import { DefaultTheme } from 'styled-components';

export const darkTheme: DefaultTheme = {
  text: {
    primary: '#f0eaea',
    secondary: '#b0a8a8',
    muted: '#6b6370',
  },
  background: {
    base: '#0f0f14',
    surface: '#1a1820',
    elevated: '#242030',
    inverse: '#504a63b9',
  },
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.04)',
    hover: 'rgba(192, 57, 43, 0.4)',
  },
  accent: {
    primary: '#e05252',
    hover: '#eb6b6b',
    soft: 'rgba(224, 82, 82, 0.15)',
    muted: 'rgba(224, 82, 82, 0.08)',
  },
};
