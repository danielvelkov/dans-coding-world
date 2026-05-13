import { useEffect, useState } from 'react';

export const useThemeDetector = () => {
  const getCurrentTheme = () =>
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const [isDarkTheme, setIsDarkTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const listener = (e: MediaQueryListEvent) => {
      setIsDarkTheme(e.matches);
    };

    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  return isDarkTheme;
};

export default useThemeDetector;
